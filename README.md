# Overture QuickStart

The Overture QuickStart provides those interested in gaining hands-on experience using an Overture platform a fast and frictionless local installation.

## Rational

With Overture we want to provide new users the following:

|Purpose|Solution|
|---|---|
| **A way to look at it**|[Overture Demo Portal](https://demo.overture.bio/)|
| **A way to try it**| Overture QuickStart |
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

- [x] **File Centric Indexing**

    - Maestro should index the data in a filecentric fashion, need to investigate if any changes to elasticsearch are required 

- [ ] **Arranger Configurations**

    - Reconfigure based on graphQL naming (post maestro manipulation), update search facets and data table

- [ ] **Arranger JSON Import**

    - Export jsons from elasticsearch and have them imported on startup, replicating arrangers make seed init operations


### Demo Portal

- [ ] **Entry Modal**

    - [x] Create a model that displays on startup providing information to new users on how to use the resource
    - [ ] Get entry modal to close onclick event

### Guides

- [ ] Administration Guide Skeleton

- [ ] Finish Download Guide

- [ ] Finish Submission Guide

- [ ] Complete Deployment Guide


## Seeded Analysis IDs

sing publish -a dc27ea50-1838-498d-a7ea-501838198d3f
sing publish -a 73ffab06-0dec-4322-bfab-060dec6322a8
sing publish -a a14535a2-08ad-40fe-8535-a208ad60feaa
sing publish -a 7be28696-49e9-4823-a286-9649e988230f
sing publish -a cbd68ea6-9584-4800-968e-a69584380061
sing publish -a 8293b32d-6f2a-43c5-93b3-2d6f2ab3c586
sing publish -a 85da7c30-2c97-4904-9a7c-302c97e904a3
sing publish -a 53a3138e-fca0-4bdb-a313-8efca06bdb3b
sing publish -a c746cc55-7a09-4f4d-86cc-557a09af4d6f
sing publish -a c8f49ad6-5ebc-4db9-b49a-d65ebc5db9ab
sing publish -a 52da3549-6fea-4527-9a35-496fea4527a9
sing publish -a 94e88c53-4a19-4547-a88c-534a19254760
sing publish -a 85487ea8-3b9d-4185-887e-a83b9d618577
sing publish -a 5f0712d4-8646-40f0-8712-d4864600f019
sing publish -a 8c3a6e0e-cf4c-401e-ba6e-0ecf4c201e51
sing publish -a 7e55b299-991e-4bcc-95b2-99991ecbccfe
sing publish -a 914a9067-b6f6-474f-8a90-67b6f6974f27
sing publish -a c07657d0-7f8b-4056-b657-d07f8ba0563e
sing publish -a 37b8e82d-1735-4c01-b8e8-2d17357c016f
sing publish -a c71414f9-26fb-4d19-9414-f926fb0d1956

`CLIENT_ACCESS_TOKEN`= 0e6d0991-b808-472a-bc3f-df16687c1b3a



                "drugName": [
                  "Tamoxifen"
                ]

                neeeds to be updated to string