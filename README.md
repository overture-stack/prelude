# Prelude Early Release

Prelude is a tool that enables teams to incrementally build their data platform. By breaking down data portal development into phased steps, teams can systematically verify requirements and user workflows while minimizing technical overhead.

Development progresses through four distinct phases, each building upon the previous phase's foundation while introducing new capabilities.

This process enables teams to:

* Validate project requirements with hands-on testing
* Gain a clear understanding of user workflows and interactions
* Documented data management processes
* Define security and access control needs
* Build a solid foundation for production deployment planning

## Prelude Development Phases

| Phase | Description | Software Components |
|-------|-------------|----------------|
| **PhaseOne:** Data Exploration & Theming | Display your tabular data in a themable portal with our front-end and back-end search components. | CSV-processor, Elasticsearch, Arranger, Stage |
| **PhaseTwo:** Tabular Data Management & Validation | Implementation of tabular data submission, storage and validation. | All the above with Lyric, LyricDb (Postgres), Lectern and LecternDb (MongoDb) added |
| **PhaseThree:** File Data & Metadata Management | Implement back-end file management. | All the above with Song, Score, SongDb (Postgres) and Object Storage (Minio) |
| **PhaseFour:** Identity and Access management | Configure Keycloak to authenticate users and authorize what they have access too. | Empahsis on data access control planning and Keycloak configuration |

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

For phaseOne run:

```
cd phaseOne/stageP1
docker build -t localstageimage:1.0 .
```

For phaseTwo run:

```
cd phaseTwo/stageP2
docker build -t localstageimage:2.0 .
```

After editing your stage folder make sure you run the above build command before deploying locally using this docker compose setup.

**4. Run one of the following commands from the root of the repository:**

| Environment | Unix/macOS | Windows |
|-------------|------------|---------|
| phaseOne Platform | `make phaseOne` | pending |
| phaseTwo Platform | `make phaseTwo` | pending |

Following startup the front end portal will be available at your `localhost:3000`

**You can also run any of the following helper commands:**

| Description | Unix/macOS | Windows | 
|-------------|------------|---------|
| Shuts down all containers | `make down` | pending | 
| Shuts down all containers & removes all persistent Elasticsearch volumes (only relevant for phaseOne) | `make clean` | pending | 

Information on usage can be found from the `/docs` folder at the root of this repo or from the documentation tab found on our front-end at `http://localhost:3000/documentation`

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
➜ docker run -d -it --name song-client \
-e CLIENT_ACCESS_TOKEN=68fb42b4-f1ed-4e8c-beab-3724b99fe528 \
-e CLIENT_STUDY_ID=demo \
-e CLIENT_SERVER_URL=http://localhost:8080 \
--network="host" \
--platform="linux/amd64" \
--mount type=bind,source=./demoData/fileData,target=/output \
ghcr.io/overture-stack/song-client:5.1.1
dadf24c9c146a1417ec4c2b0e1cf9da7aa08ba08bb325de915351262af1f4955
```

3. Update Song with the premade Schema 

4. Submit the mock file metadata

`docker exec song-client sh -c "sing submit -f /output/PL098798.json"`

5. Generate a manafest

`docker exec song-client sh -c "sing manifest -a {AnalysisId} -f /output/manifest.txt -d /output/"`

6. Submit the payload

`docker exec score-client sh -c "score-client  upload --manifest /output/manifest.txt"`
