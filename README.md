# Overture QuickStart

The Overture QuickStart provides those interested in gaining hands-on experience using an Overture platform a fast and frictionless local installation.

## Rational

With Overture we want to provide new users the following:

|Purpose|Solution|
|---|---|
| **A way to look at it**|[Overture Demo Portal](https://demo.overture.bio/)|
| **A way to try it**| Overture Composer |
| **A way to own it**| [Product Documentation](https://www.overture.bio/documentation/) *and* [Platform Guides](https://github.com/overture-stack/website/pull/385)|

## Getting Started

**1. Download and configure Docker Desktop**

- In Docker Desktop click the cog icon, then resources. Set CPU to `8`, memory to `12GB`, swap to `4GB`, and virtual disk to `128GB`

**2. Clone the QuickStart Repository**

```bash
git clone https://github.com/overture-stack/composer.git && cd composer
```

**3. Run the Docker Compose**

```bash
docker compose up -d
```
Your portal will be accessible from your `localhost:3000`

## Remaining Tasks 

### QuickStart

- [x] **Indexing Setup Check**

    - The index setup image should check to see if an index already exists, if yes then it should exit out (enabling arranger-server to run) else it should create the index as is

    **Solution**

    ```bash
        # Install curl without caching packages to reduce disk space usage
        apk --no-cache add curl && 

        # Wait for 60 seconds to ensure services like Elasticsearch have started up
        sleep 60 && 

        # Check if the index template named 'index_template' already exists
        if! curl -s -u elastic:myelasticpassword 'http://elasticsearch:9200/_template/index_template' | grep -q '\"index_patterns\"'; then 
            # If the template does not exist, create it using a JSON file located at /usr/share/elasticsearch/config/composer_index_template.json
            curl -u elastic:myelasticpassword -X PUT 'http://elasticsearch:9200/_template/index_template' -H 'Content-Type: application/json' -d @/usr/share/elasticsearch/config/composer_index_template.json &&
            echo 'Template created successfully.'; 
        else 
            # If the template already exists, skip the creation process
            echo 'Template already exists, skipping creation.'; 
        fi

        # Attempt to create an alias named 'analysis_composer-index' with write access enabled
        if curl -s -o /dev/null -w '%{http_code}' -u elastic:myelasticpassword -X PUT 'http://elasticsearch:9200/analysis-composer-index' -H 'Content-Type: application/json' -d '{\"aliases\": {\"analysis_centric\": {\"is_write_index\": true}}}' | grep -q '200'; then 
            # If the alias is created successfully, print a success message
            echo 'Alias created successfully.'; 
        else 
            # If the alias creation fails, check if the index already exists
            if curl -s -o /dev/null -w '%{http_code}' -u elastic:myelasticpassword -X GET 'http://elasticsearch:9200/analysis-composer-index' | grep -q '200'; then
                # If the index exists but the alias was not created, print a message indicating the alias already exists
                echo 'Alias already exists, skipping creation.';
            else
                # If both the index and alias failed to be created, print an error message and exit the script with an error status
                echo 'Failed to create alias.'; 
                exit 1; 
            fi
        fi
    ```

**flags used**

| Flag         | Description                                                                                   |
|--------------|---------------------------------------------------------------------------------------------------|
| `-s`         | Silent mode, suppresses progress meter and error messages.                                      |
| `-u`         | Specifies the username and password for server authentication.                                   |
| `-X`         | Specifies a custom request method (e.g., `PUT`, `GET`).                                           |
| `-H`         | Includes extra header lines in the request.                                                       |
| `-d`         | Sends the specified data in a POST request.                                                         |
| `-o`         | Writes output to a file instead of stdout.                                                          |
| `-w`         | Displays specified information on stdout after a completed operation.                               |
| `-o /dev/null`| Discards the output by redirecting it to `/dev/null`.                                              |

- [ ] **File Centric Indexing**

    - Maestro should index the data in a filecentric fashion, need to investigate if any changes to elasticsearch are required 

- [ ] **Arranger Configurations**

    - Reconfigure based on graphQL naming (post maestro manipulation), update search facets and data table

- [ ] **Arranger JSON Import**

    - Export jsons from elasticsearch and have them imported on startup, replicating arrangers make seed init operations


### Demo Portal

- [ ] **Entry Modal**

    - Create a model that displays on startup providing information to new users on how to use the resource

### Guides

- [ ] Administration Guide Skeleton

- [ ] Finish Download Guide

- [ ] Finish Submission Guide

- [ ] Complete Deployment Guide

