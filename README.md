# Prelude Pre-release

Prelude is a tool that enables teams to incrementally build their data platform.
By breaking down data portal development into phased steps, teams can
systematically verify requirements and user workflows while minimizing technical
overhead.

This process enables teams to:

- Validate project requirements with hands-on testing
- Gain a clear understanding of user workflows and interactions
- Documented data management processes
- Define security and access control needs
- Build a solid foundation for production deployment planning

## Development Phases

Development progresses through four distinct phases, each building upon the
previous phase's foundation while introducing new capabilities.

| Phase                                              | Description                                                                                       | Software Components                                                                 | Status         |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | -------------- |
| **PhaseOne:** Data Exploration & Theming           | Display your tabular data in a themable portal with our front-end and back-end search components. | CSV-processor, Elasticsearch, Arranger, Stage                                       | 🟢 Working     |
| **PhaseTwo:** Tabular Data Management & Validation | Implementation of tabular data submission, storage and validation.                                | All the above with Lyric, LyricDb (Postgres), Lectern and LecternDb (MongoDb) added | 🟡 Pending     |
| **PhaseThree:** File Data & Metadata Management    | Implement back-end file management.                                                               | All the above with Song, Score, SongDb (Postgres) and Object Storage (Minio)        | 🟡 Pending     |
| **PhaseFour:** Identity and Access management      | Configure Keycloak to authenticate users and authorize what they have access too.                 | Empahsis on data access control planning and Keycloak configuration                 | ⚪ Not Started |

## Prerequisites

### Required Software

- Node.js 18 or higher
- npm 9 or higher
- Docker Desktop 4.32.0 or higher
  ([Download here](https://www.docker.com/products/docker-desktop/))

### Docker Resource Requirements

> [!important] Allocate sufficient resources to Docker:
>
> - Minimum CPU: `8 cores`
> - Memory: `8 GB`
> - Swap: `2 GB`
> - Virtual disk: `64 GB`
>
> Adjust these in Docker Desktop settings under "Resources".

### Running the portal

#### Step 1: Installation & Setup

1. **Clone the repo branch**

```
git clone -b preludeV2.1 https://github.com/overture-stack/conductor.git
```

2. **Build the Stage image using the dockerfile** For phaseOne run:

```
cd apps/stage
docker build -t localstageimage:1.0 .
```

After editing your stage folder make sure you run the above build command before
deploying locally using this docker compose setup.

#### Step 2: Deployment

Run one of the following commands **from the root of the repository**:

| Environment          | Unix/macOS       | Windows |
| -------------------- | ---------------- | ------- |
| Phase One Platform   | `make phase-one` | pending |
| Phase Two Platform   | pending          | pending |
| Phase Three Platform | pending          | pending |
| Stage Development    | `make stage-dev` | pending |

Following startup the front end portal will be available at your
`localhost:3000`

### Helper Commands

| Description                                                                                 | Unix/macOS              | Windows |
| ------------------------------------------------------------------------------------------- | ----------------------- | ------- |
| Shuts down all containers                                                                   | `make down`             | pending |
| Shuts down all containers and removes volumes                                               | `make reset`            | pending |
| Submits pre-configured demo data                                                            | `make load-data`        | pending |
| Generates index mappings and arranger configurations using the default tabularData.csv file | `make generate-configs` | pending |
| Removes all documents from elasticsearch                                                    | `make clean-data`       | pending |

## Documentation

Detailed documentation can be found in multiple locations:

- The `/docs` folder at the root of this repository
- README files within each root directory containing information on the folder's
  purpose and usage
- Frontend documentation available after deployment at
  `http://localhost:3000/documentation`
