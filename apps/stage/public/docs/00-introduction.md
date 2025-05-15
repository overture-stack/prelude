# Introduction

## Introduction

**Prelude** is a toolkit designed for the **planning and development stages** of Overture data platform implementation. It helps teams incrementally build and validate platform requirements, enabling them to:

- Systematically verify requirements
- Minimize technical overhead
- Build a foundation for production deployment

**Important:** Prelude is **not intended for production environments**. It serves as a preparatory tool to ensure successful production deployments. We are actively enhancing resources to support teams transitioning from Prelude to production.

We welcome feedback and suggestions—please share them via our [ideas forum](https://github.com/overture-stack/docs/discussions/categories/ideas).

## Development Phases

Prelude is structured into four incremental phases:

![Development Phases](/docs/images/preludeOverview.png "Prelude Development Phases")

| **Phase**                               | **Focus**                                           | **Components/Tools**                            |
| --------------------------------------- | --------------------------------------------------- | ----------------------------------------------- |
| **Phase 0:** Pre-Deployment Check       | Making sure you have all the required prerequisites | Docker, appropriate resources for docker & Node |
| **Phase 1:** Data Exploration & Theming | Data visualization in the portal                    | Elasticsearch, Arranger, Stage                  |
| **Phase 2:** Tabular Data Management    | Backend data storage and validation                 | Lyric, Lectern, Postgres, MongoDB               |
| **Phase 3:** File Management            | File storage and metadata tracking                  | Song, Score, Object Storage                     |
| **_Phase 4:_** Identity & Access        | Security and user management                        | Keycloak integration                            |

**Phase 4** is not included in Prelude v1 and will be included in a future release.

## Supplemental Tools

### Composer

Composer is a configuration generator tool for Overture. It streamlines the creation of configuration files required by various Overture components.

Depending on the command Composer can input CSV or JSON file(s) that represent your data and output the following:

| Output                            | Purpose                                                                                          |
| --------------------------------- | ------------------------------------------------------------------------------------------------ |
| **Elasticsearch Mappings**        | Defines the structure and indexing settings for your data                                        |
| **Arranger UI Configs**           | Configures the user interface for data exploration and visualization                             |
| **Lectern Dictionary and Schema** | Creates data dictionaries and schemas for tabular data with flat or hierarchical data structures |
| **Song Schema**                   | Generates schema configurations for file metadata                                                |

### Conductor

Conductor streamlines managment and interaction with Overture microservices in two ways:

1. **Deployment Automation**: Conductor manages and orchestrates Overture deployments through scripts found in the `scripts` directory. These are initiated from the docker-compose. This provides a consistent and reliable environment setup.

2. **Command-Line Interface**: Conductor offers a unified CLI for interacting with various Overture service APIs. The command line client includes additional validations and helpful error logging to improve the user experience.

As summary of command line client interactions is provided in the dropdown below:

<details>
<summary>Conductor Commands</summary>

#### CSV to Elasticsearch ETL

- `conductor upload` - Upload and transform CSV data to Elasticsearch with configurable batch size and delimiters

#### Data Management

- `conductor lyricUpload` - Upload tabular data to Lyric
- `conductor songSubmitAnalysis` - Submit analysis metadata to Song
- `conductor scoreManifestUpload` - Generate and upload file manifests
- `conductor songPublishAnalysis` - Publish analysis data
- `conductor maestroIndex` - Index repository content (supports organization filtering and specific document indexing)

#### Configuration Management

- `conductor lecternUpload` - Upload dictionaries to Lectern
- `conductor lyricRegister` - Register dictionaries with Lyric
- `conductor songUploadSchema` - Upload Song schemas
- `conductor songCreateStudy` - Create Song studies

</details>

## Getting Started

_If you’re reading from the Prelude documentation page, this section may be redundant._

### 1. Clone the repository

```sh
git clone -b prelude https://github.com/overture-stack/conductor.git
cd conductor
```

### 2. Pre-deployment Check

Run a pre-deployment check:

```sh
make phase0
```

**Requirements:**

- **Docker Desktop 4.39.0+** with:
  - 8-core CPU minimum
  - 8 GB memory
  - 2 GB swap
  - 64 GB virtual disk
- **Node.js 20.18.1+ and npm 9+**
- **Linux/macOS environment**

**Note For Windows Users:** Please use WSL2 with a Bash terminal for all commands in this documentation. Prelude is not supported on native Windows environments.

<details>
<summary>Windows Support</summary>

Windows users should:

1. Install [WSL2 (Windows Subsystem for Linux)](https://learn.microsoft.com/en-us/windows/wsl/install)
2. Use Ubuntu or another Linux distribution within WSL2
3. Run all Prelude commands from the Bash terminal in your WSL2 environment
4. Install Docker Desktop with WSL2 integration enabled`

WSL2 provides a full Linux kernel and compatibility layer, allowing you to run Prelude's Linux commands without modification.

</details>

### 3. Build the local Stage UI image

```sh
cd apps/stage
docker build --platform linux/arm64 -t stageimage:1.0 .
```

### 4. Deploy Phase 1

Run from the root directory:

```sh
make phase1
```

> **How this works:** the make command runs the `phase1` profile defined across the `docker-compose.yml`, given this profile the conductor service, found at the top of the `docker-compose.yml`, will run the appropriate `phase1.sh` deployment script found at `apps/conductor/scripts/deployments/phase1.sh`.

### 5. Access the Portal

Once running, access the portal at: [http://localhost:3000](http://localhost:3000).

## Support

For assistance, reach out via our [community support channels](https://docs.overture.bio/community/support):

- **Public support:** Use GitHub issues
- **Private inquiries:** Contact us via OICR Slack or [contact@overture.bio](mailto:contact@overture.bio)

We’re actively working on resources to help teams transition to production. If you have suggestions, post them on our [GitHub discussion forum](https://github.com/overture-stack/docs/discussions/categories/ideas).
