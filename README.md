# Overture Demo Portal — File Submission & Download

A local demo portal that lets you submit new genomic data to an Overture platform and download data already held in it, through the Song and Score command-line clients and a web-based data explorer.

The portal is built on [Overture](https://www.overture.bio/), an open-source suite of software for managing, searching, and sharing genomics data. This branch (`docs-demo/file-transfer`) is a self-contained demo environment that backs two guides on the Overture documentation site:

- [File Submission](https://docs.overture.bio/docs/use-docs/cli-submissions) — registering analyses and uploading files with the Song and Score clients.
- [File Download](https://docs.overture.bio/docs/use-docs/cli-downloads) — searching the portal, exporting a manifest, and pulling files with the Score client.

## Prerequisites

| Requirement    | Minimum version | Notes                                |
| -------------- | --------------- | ------------------------------------ |
| Docker Desktop | 4.39.0          | Allocate at least 8 GB RAM to Docker |
| Make           | any             | Pre-installed on macOS/Linux         |
| Git            | any             | To clone the repository              |

> **Disk space:** Allow at least 10 GB free for Docker images and volumes.

## Getting the Demo

Clone this branch of the Prelude repository:

```bash
git clone -b docs-demo/file-transfer https://github.com/overture-stack/prelude.git
cd prelude
```

## Starting the Platform

```bash
make platform
```

This starts all services and runs automated setup. The setup container orchestrates, in order: an Elasticsearch health check, index and alias creation, Stage and Arranger startup, MinIO bucket creation, Kafka readiness, Song study creation (the `demo` study), analysis-schema registration (`genomicVariants`), and Score and Maestro health checks.

> **First run:** Docker pulls all images before starting. This can take several minutes depending on your connection. Subsequent starts are much faster.

`make platform` starts the stack empty so you can submit your own data (the File Submission guide). To start the same stack with the sample dataset already loaded, use `make demo` instead, or run `make submit` after `make platform`.

## Loading Sample Data

After the platform is running, load the sample dataset:

```bash
make submit
```

This submits 3 donor analyses (12 genomic files total) to Song and Score, then publishes them. Maestro automatically indexes the files into Elasticsearch within a few seconds, and the portal shows 12 records once indexing completes.

See [docs/user/01-Data-Submission.md](docs/user/01-Data-Submission.md) for full details, including how to submit using the Song and Score client CLIs directly.

## Sample Dataset

The sample data is synthetic dummy data for demonstration only. It covers 3 donors, each with 4 small placeholder genomic files:

| Donor   | Primary diagnosis         | Files                                    |
| ------- | ------------------------- | ---------------------------------------- |
| `DO001` | Breast Adenocarcinoma     | SNV, INDEL, CNV, SV (`DO001.*`)          |
| `DO002` | Lung Adenocarcinoma       | SNV, INDEL, CNV, SV (`DO002.*`)          |
| `DO003` | Colorectal Adenocarcinoma | SNV, INDEL, CNV, SV (`DO003.*`)          |

The file contents are placeholders; Song and Score compute real file sizes and checksums from disk at submission time. Clinical fields are defined by the `genomicVariants` analysis schema and exposed as search facets in the portal.

## Stopping and Restarting

```bash
make down        # Stop all containers (data preserved)
make platform    # Restart
```

Data in Elasticsearch, Song, and MinIO is stored in named Docker volumes and survives container restarts.

## Resetting

| Command           | What it does                                                                                                                                  |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `make reset-song` | Removes only Song's database, clearing analysis registrations so data can be resubmitted from scratch. Does not affect Elasticsearch or MinIO. |
| `make reset`      | Removes **all** containers and volumes. Complete data loss; use for a full clean start. Prompts for confirmation.                             |

After `make reset-song`, re-run `make platform` to recreate the study and schema, then resubmit data.

## Verifying Services

```bash
make status
```

You can also check individual service health endpoints:

| Service       | Health URL                                                                         |
| ------------- | ---------------------------------------------------------------------------------- |
| Song          | [http://localhost:8080/isAlive](http://localhost:8080/isAlive)                     |
| Score         | [http://localhost:8087/download/ping](http://localhost:8087/download/ping)         |
| Maestro       | [http://localhost:11235/health](http://localhost:11235/health)                     |
| Elasticsearch | [http://localhost:9200/\_cluster/health](http://localhost:9200/_cluster/health)    |
| MinIO         | [http://localhost:8085/minio/health/live](http://localhost:8085/minio/health/live) |
| Arranger      | [http://localhost:5050/health](http://localhost:5050/health)                       |
| Portal        | [http://localhost:3000](http://localhost:3000)                                     |

## API and Swagger UIs

| Service          | URL                                                                            |
| ---------------- | ------------------------------------------------------------------------------ |
| Song Swagger     | [http://localhost:8080/swagger-ui.html](http://localhost:8080/swagger-ui.html) |
| Maestro API docs | [http://localhost:11235/api-docs](http://localhost:11235/api-docs)             |

## Windows / WSL2

Prelude is designed for Linux and macOS. Windows users must use WSL2:

1. Install [WSL2](https://learn.microsoft.com/en-us/windows/wsl/install) with Ubuntu or a similar distribution
2. Install Docker Desktop with **WSL2 integration** enabled
3. Clone and run all commands from the WSL2 Bash terminal
4. Docker volume paths and Make targets work without modification inside WSL2

Native Windows (PowerShell, CMD) is not supported.

## Architecture

```
Researcher → Stage (portal UI)
               ↓ GraphQL
           Arranger (search API)
               ↓
         Elasticsearch (index)
               ↑ indexed by
            Maestro
               ↑ Kafka events
              Song (metadata registry)
               ↕ validates
             Score (file transfer)
               ↕
             MinIO (object storage)
```

Clinical metadata and genomic file records flow from Song through Kafka into Elasticsearch. Researchers search and filter through Stage; file downloads are served via Score presigned URLs.

## Documentation

| Document                                                                         | Audience      | Description                                       |
| -------------------------------------------------------------------------------- | ------------- | ------------------------------------------------- |
| [docs/user/01-Data-Submission.md](docs/user/01-Data-Submission.md)               | Data managers | Submitting analyses and files                     |
| [docs/user/02-Data-Download.md](docs/user/02-Data-Download.md)                   | Researchers   | Searching, exporting manifests, downloading files |
| [docs/admin/03-Data-Model-Management.md](docs/admin/03-Data-Model-Management.md) | Operators     | Managing analysis type schemas                    |
| [docs/admin/04-Song-Schema-Reference.md](docs/admin/04-Song-Schema-Reference.md) | Operators     | Song JSON Schema authoring reference              |

## Commands

| Command           | Description                                           |
| ----------------- | ----------------------------------------------------- |
| `make demo`       | Start all services with the sample data pre-loaded    |
| `make platform`   | Start all services empty (submit your own data)       |
| `make submit`     | Load sample genomic data via Docker network           |
| `make reset-song` | Reset Song DB only (clears analyses for resubmission) |
| `make reset`      | Full reset; removes all containers and volumes        |
| `make down`       | Stop all containers                                   |
| `make status`     | Show running container health                         |
