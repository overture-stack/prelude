String podSpec = '''
apiVersion: v1
kind: Pod
spec:
  containers:
  - name: node
    image: node:lts
    tty: true
  - name: docker
    image: docker:18-git
    tty: true
    env:
    - name: DOCKER_HOST
      value: tcp://localhost:2375
    - name: HOME
      value: /home/jenkins/agent
  - name: helm
    image: alpine/helm:3.1.0
    command:
    - cat
    tty: true
  - name: dind-daemon
    image: docker:18.06-dind
    securityContext:
      privileged: true
      runAsUser: 0
    volumeMounts:
    - name: docker-graph-storage
      mountPath: /var/lib/docker
  securityContext:
    runAsUser: 1000
  volumes:
  - name: docker-graph-storage
    emptyDir: {}
'''

pipeline {
    agent {
        kubernetes {
            yaml podSpec
        }
    }

    environment {
        gitHubRegistry = 'ghcr.io'
        gitHubRepo = 'overture-stack/dms-ui'
        gitHubImageName = "${gitHubRegistry}/${gitHubRepo}"

        commit = sh(
            returnStdout: true,
            script: 'git describe --always'
        ).trim()

        version = sh(
            returnStdout: true,
            script:
                'cat ./package.json | ' +
                'grep "version" | ' +
                'cut -d : -f2 | ' +
                "sed \'s:[\",]::g\'"
        ).trim()

        slackNotificationsUrl = credentials('OvertureSlackJenkinsWebhookURL')
    }

    options {
        timeout(time: 30, unit: 'MINUTES')
        timestamps()
    }

    parameters {
        choice(
            name: 'POST_BUILD',
            choices: ['Nothing', 'Publish only', 'Publish and Deploy'],
            description: 'What to do after building the images'
        )
    }

    stages {
        stage('Run tests') {
            steps {
                container('node') {
                    sh 'npm ci'
                    sh 'npm run test'
                }
            }
        }

        stage('Build image') {
            steps {
                container('docker') {
                    // DNS error if --network is default
                    sh "docker build \
                        --build-arg APP_COMMIT=${commit} \
                        --build-arg APP_VERSION=${version} \
                        --network=host \
                        -f Dockerfile \
                        -t dms-ui:${commit} ."
                }
            }
        }

        stage('Publish tag to github') {
            when {
                branch 'main'
            }
            steps {
                container('node') {
                    withCredentials([
                        usernamePassword(
                            credentialsId: 'OvertureBioGithub',
                            passwordVariable: 'GIT_PASSWORD',
                            usernameVariable: 'GIT_USERNAME'
                        ),
                    ]) {
                        script {
                            // we still want to run the platform deploy even if this fails, hence try-catch
                            try {
                                sh "git tag ${version}"
                                sh "git push https://${GIT_USERNAME}:${GIT_PASSWORD}@github.com/${gitHubRepo} --tags"
                                sh "curl \
                                    -X POST \
                                    -H 'Content-type: application/json' \
                                    --data '{ \
                                        \"text\":\"New DMS-UI published succesfully: v.${version}\
                                        \n[Build ${env.BUILD_NUMBER}] (${env.BUILD_URL})\" \
                                    }' \
                                    ${slackNotificationsUrl}"
                            } catch (err) {
                                echo 'There was an error while publishing packages'
                            }
                        }
                    }
                }
            }
        }

        stage('Publish Images') {
            when {
                anyOf {
                    branch 'develop'
                    branch 'main'
                    expression { return params.POST_BUILD ==~ /.*Publish.*/ }
                }
            }
            steps {
                container('docker') {
                    withCredentials([
                        usernamePassword(
                            credentialsId:'OvertureBioGithub',
                            passwordVariable: 'PASSWORD',
                            usernameVariable: 'USERNAME',
                        )
                    ]) {
                        sh "docker login ${gitHubRegistry} -u $USERNAME -p $PASSWORD"

                        script {
                            if (env.BRANCH_NAME ==~ /(main)/) { // push latest and version tags
                                sh "docker tag dms-ui:${commit} ${gitHubImageName}:${version}"
                                sh "docker push ${gitHubImageName}:${version}"

                                sh "docker tag dms-ui:${commit} ${gitHubImageName}:latest"
                                sh "docker push ${gitHubImageName}:latest"
                            } else { // push commit tags
                                sh "docker tag dms-ui:${commit} ${gitHubImageName}:${commit}"
                                sh "docker push ${gitHubImageName}:${commit}"
                            }

                            if (env.BRANCH_NAME ==~ /(develop)/) { // push edge tag
                                sh "docker tag dms-ui:${commit} ${gitHubImageName}:edge"
                                sh "docker push ${gitHubImageName}:edge"
                            }
                        }
                    }
                }
            }
        }

        stage('Deploy to overture-qa') {
            when {
                anyOf {
                    branch 'develop'
                    expression { return params.POST_BUILD ==~ /.*Deploy.*/ }
                }
            }
            steps {
                build(job: '/Overture.bio/provision/DeployWithHelm', parameters: [
                    string(name: 'OVERTURE_ARGS_LINE', value: "--set-string image.tag=${commit}"),
                    string(name: 'OVERTURE_CHART_NAME', value: 'dms-ui'),
                    string(name: 'OVERTURE_ENV', value: 'qa'),
                    string(name: 'OVERTURE_HELM_CHART_VERSION', value: ''), // use latest
                    string(name: 'OVERTURE_HELM_REPO_URL', value: 'https://overture-stack.github.io/charts-server/'),
                    string(name: 'OVERTURE_HELM_REUSE_VALUES', value: 'false'),
                    string(name: 'OVERTURE_RELEASE_NAME', value: 'dms-ui'),
                ])
            }
        }

        stage('Deploy to overture-staging') {
            when {
                anyOf {
                    branch 'main'
                }
            }
            steps {
                build(job: '/Overture.bio/provision/DeployWithHelm', parameters: [
                    string(name: 'OVERTURE_ARGS_LINE', value: "--set-string image.tag=${version}"),
                    string(name: 'OVERTURE_CHART_NAME', value: 'dms-ui'),
                    string(name: 'OVERTURE_ENV', value: 'staging'),
                    string(name: 'OVERTURE_HELM_CHART_VERSION', value: ''), // use latest
                    string(name: 'OVERTURE_HELM_REPO_URL', value: 'https://overture-stack.github.io/charts-server/'),
                    string(name: 'OVERTURE_HELM_REUSE_VALUES', value: 'false'),
                    string(name: 'OVERTURE_RELEASE_NAME', value: 'dms-ui'),
                ])
            }
        }
    }

    post {
        failure {
            container('node') {
                script {
                    if (env.BRANCH_NAME ==~ /(develop|main|\S*[Tt]est\S*)/) {
                        sh "curl \
                            -X POST \
                            -H 'Content-type: application/json' \
                            --data '{ \
                                \"text\":\"Build Failed: ${env.JOB_NAME} \
                                \n[Build ${env.BUILD_NUMBER}](${env.BUILD_URL}) \" \
                            }' \
                            ${slackNotificationsUrl}"
                    }
                }
            }
        }

        fixed {
            container('node') {
                script {
                    if (env.BRANCH_NAME ==~ /(develop|main|\S*[Tt]est\S*)/) {
                        sh "curl \
                            -X POST \
                            -H 'Content-type: application/json' \
                            --data '{ \
                                \"text\":\"Build Fixed: ${env.JOB_NAME} \
                                \n[Build ${env.BUILD_NUMBER}](${env.BUILD_URL}) \" \
                            }' \
                            ${slackNotificationsUrl}"
                    }
                }
            }
        }

        success {
            container('node') {
                script {
                    if (env.BRANCH_NAME ==~ /(\S*[Tt]est\S*)/) {
                        sh "curl \
                            -X POST \
                            -H 'Content-type: application/json' \
                            --data '{ \
                                \"text\":\"Build Tested: ${env.JOB_NAME} \
                                \n[Build ${env.BUILD_NUMBER}](${env.BUILD_URL}) \" \
                            }' \
                            ${slackNotificationsUrl}"
                    }
                }
            }
        }
    }
}
