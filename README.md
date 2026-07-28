# Build a Search Portal — Overture Demo

A hands-on workshop for building a data discovery portal for tabular CSV data using Elasticsearch, Arranger, and Stage. This branch (`docs-demo/search-portal-workshop`) is a self-contained demo environment that backs the [Build a Search Portal](https://docs.overture.bio/use/workshop/prerequisites) workshop on the Overture documentation site.

<p align="center">
   <img src="https://github.com/user-attachments/assets/32c5c20e-e786-4a2a-9e15-5aca3effe7a0" alt="Workshop Portal Preview" width="800">
</p>

## Prerequisites

Before starting, ensure you have:

- **Git** — `git --version` returns a version number
- **Docker Desktop 28.0.0+** — running with 4+ CPUs and 8 GB+ memory allocated
- **Docker images pre-pulled** (most time-consuming step — do this first):

  ```bash
  docker pull alpine/curl:8.8.0
  docker pull postgres:15-alpine
  docker pull docker.elastic.co/elasticsearch/elasticsearch:7.17.27
  docker pull ghcr.io/overture-stack/arranger-server:4919f736
  docker pull ghcr.io/overture-stack/conductor:171d9ce
  docker pull node:18-alpine
  ```

- **Windows users:** WSL2 configured with Docker Desktop integration enabled — run all commands from a Bash terminal inside WSL2

See [docs.overture.bio/use/workshop/prerequisites](https://docs.overture.bio/use/workshop/prerequisites) for full setup instructions.

## Quick Start

1. **Clone this repository:**

   ```bash
   git clone -b docs-demo/search-portal-workshop https://github.com/overture-stack/prelude.git
   cd prelude
   ```

2. **Run the demo:**

   ```bash
   make demo
   ```

   The portal will open in your browser once deployment is complete.

## Workshop Documentation

Full step-by-step workshop documentation is available in the [`docs/`](docs/) directory and rendered in the portal UI once running.

| Step | Doc |
|------|-----|
| 0 | [Intro & Prerequisites](docs/00-Workshop.md) |
| 1 | [Running the Demo](docs/01-Running-the-Demo.md) |
| 2 | [Architecture](docs/02-Architecture.md) |
| 3 | [Data Preparation](docs/03-Data-Preparation.md) |
| 4 | [Generating Configurations](docs/04-Generating-Configurations.md) |
| 5 | [Docker Configuration](docs/05-Docker-Configuration.md) |
| 6 | [Loading Data](docs/06-Loading-Data.md) |
| 7 | [Troubleshooting](docs/07-Troubleshooting.md) |
| 8 | [Portal Customization](docs/08-Portal-Customization.md) |
| 9 | [Next Steps](docs/09-Next-Steps.md) |
| 10 | [Extension Task](docs/10-Extension-Task.md) |

## Architecture

1. **Data preparation:** CSV files processed by Conductor (ETL)
2. **Indexing:** Data loaded into Elasticsearch
3. **Querying:** Arranger queries Elasticsearch via GraphQL
4. **Portal UI:** Stage renders Arranger search components for real-time filtering and exploration

## Support

|                 |                                                                                                                                  |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| **Questions**   | [community support channels](https://docs.overture.bio/community/support) or [contact@overture.bio](mailto:contact@overture.bio) |
| **Bug reports** | [GitHub Issues](https://github.com/overture-stack/prelude/issues)                                                                |
