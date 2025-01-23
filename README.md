## Running the portal

1. **Set Up Docker:** Install or update to Docker Desktop version 4.32.0 or higher. Visit [Docker's website](https://www.docker.com/products/docker-desktop/) for installation details.

> [!important]
> Allocate sufficient resources to Docker:
>   - Minimum CPU: `8 cores`
>   - Memory: `8 GB`
>   - Swap: `2 GB`
>   - Virtual disk: `64 GB`
>
> Adjust these in Docker Desktop settings under "Resources".

**2. Clone the repo branch**

```
git clone -b prelude https://github.com/overture-stack/conductor.git
```

**3. Build a Stage image using the dockerfile**

```
cd stage
docker build -t localstageimage:2.0 .
```


After editing your stage folder make sure you run the above build command before deploying locally using this docker compose setup.

**4. Run the following command from the root of the repository:**

`make platform`

Following startup the front end portal will be available at your `localhost:3000`

**You can also run any of the following helper commands:**

| Description | Unix/macOS | Windows | 
|-------------|------------|---------|
| Shuts down all containers | `make down` | pending | 

## Data Submition

1. Run the Score-client:

```
docker run -d -it --name score-client \
    -e ACCESSTOKEN=68fb42b4-f1ed-4e8c-beab-3724b99fe528 \
    -e STORAGE_URL=http://localhost:8087 \
    -e METADATA_URL=http://localhost:8080 \
    --network="host" \
    --platform="linux/amd64" \
    --mount type=bind,source=./demoData/fileData,target=/output \
    ghcr.io/overture-stack/score:latest
```

2. Run the Song Client

```
docker run -d -it --name song-client \
-e CLIENT_ACCESS_TOKEN=68fb42b4-f1ed-4e8c-beab-3724b99fe528 \
-e CLIENT_STUDY_ID=demo \
-e CLIENT_SERVER_URL=http://localhost:8080 \
--network="host" \
--platform="linux/amd64" \
--mount type=bind,source=./demoData/fileData,target=/output \
ghcr.io/overture-stack/song-client:5.1.1
```

3. Update Song with the premade Schema 

4. Submit the mock file metadata

`docker exec song-client sh -c "sing submit -f /output/PL098798.json"`

5. Generate a manafest

`docker exec song-client sh -c "sing manifest -a {AnalysisId} -f /output/manifest.txt -d /output/"`

6. Submit the payload

`docker exec score-client sh -c "score-client  upload --manifest /output/manifest.txt"`

7. Publish the payload

ff837b02-0418-4a7c-837b-0204185a7c3e