# Conductor 

Conductor is a flexible Docker Compose setup that simplifies the process of spinning up Overture development and deployment configurations using Docker profiles and extensible scripting events.

## Key Features

- **Profile-based Deployments**: Uses Docker profiles to manage different environment setups.
- **Conductor-driven Execution**: The Conductor service executes ordered scripts based on the `PROFILE` environment variable.

## Getting Started

**1. Clone the repo branch**

```
git clone -b concerto https://github.com/overture-stack/composer.git && cd composer
```

**2. Run one of the following commands to spin up different environments:**

| Environment | Unix/macOS | Windows |
|-------------|------------|---------|
| Overture Platform | `make platform` | `make.bat platform` |
| Stage Dev | `make stageDev` | `make.bat stageDev` |
| Arranger Dev | `make arrangerDev` | `make.bat arrangerDev` |
| Maestro Dev | `make maestroDev` | `make.bat maestroDev` |
| Song Dev | `make songDev` | `make.bat songDev` |
| Score Dev | `make scoreDev` | `make.bat scoreDev` |

Each command spins up complementary services for the specified development environment.

## Repository Structure

```
.
├── conductorScripts/
│   ├── deployments
│   └── services
├── configurationFiles/
│   ├── arrangerConfigs
│   ├── elasticsearchConfigs
│   └── keycloakConfigs
├── guideMaterials
├── persistentStorage/
│   ├── data-keycloak-db
│   ├── data-minio
│   └── data-song-db
├── Makefile
└── make.bat
```

- **`conductorScripts/`** Contains scripts for orchestrating the deployment process.
    - `deployments/`: Scripts that execute service scripts sequentially based on the deployment configuration. These also include custom post-deployment logs with essential next steps for the deployment scenario.
    - `services/`: Modular scripts for individual service setup tasks. Each file is named according to its purpose, with inline comments documenting the code.

- **`configurationFiles/`** Stores all required configuration files, including:
    - `arrangerConfigs/`: Configuration files specific to Arranger.
    - `elasticsearchConfigs/`: Configuration files for Elasticsearch, encompassing indexing mappings and documents for seeding data.
    - `keycloakConfigs/`: Configuration files for Keycloak, including preconfigured realm files and Overture API key provider details.

- **`guideMaterials/`** Supplementary folders and files for use with the [Overture guides](https://www.overture.bio/documentation/guides/).

- **`persistentStorage/`** Directory for storing persistent data during container startups and restarts. These folders come pre-loaded with mock data.
    - `data-keycloak-db/`: Persistent local storage for the Keycloak database.
    - `data-minio/`: Persistent local storage for MinIO object storage.
    - `data-song-db/`: Persistent local storage for the Song database.

- **`Makefile`** Contains make commands for Unix-based systems (macOS, Linux) to streamline Docker operations.

- **`make.bat`** Windows equivalent of the Makefile, featuring batch commands tailored for Windows systems.
