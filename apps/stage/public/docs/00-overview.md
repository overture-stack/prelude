# Overview

## Overview

Prelude is a toolkit designed specifically for the **planning and development stages** of Overture data platform implementation. It guides teams through building and validating data platform requirements incrementally, enabling them to:

- Systematically verify requirements and user workflows
- Minimize technical overhead during planning and prototype phases
- Create a comprehensive blueprint for production deployment

**Important:** Prelude is **not intended for production environments**. It serves as a preparatory tool to ensure successful production deployments. We are actively enhancing resources to support teams bridging from prelude to production.

Any feedback and suggestions are valuable to us - please share them through our [ideas forum](https://github.com/overture-stack/docs/discussions/categories/ideas).

## Development Phases

Prelude is segmented across four phases incremental phases:

![Development Phases](/docs/images/architecture.png 'Prelude Development Phases')

| Phase                                   | Focus                                    | Components                        |
| --------------------------------------- | ---------------------------------------- | --------------------------------- |
| **Phase 1:** Data Exploration & Theming | How your data is displayed in the portal | Elasticsearch, Arranger, Stage    |
| **Phase 2:** Tabular Data Management    | Back-end data storage and validation     | Lyric, Lectern, Postgres, MongoDB |
| **Phase 3:** File Management            | File storage and metadata tracking       | Song, Score, Object Storage       |
| **_Phase 4:_** Identity & Access        | Security and user management             | Keycloak integration              |

**Phase 4**, is not included in the Prelude version 1 release, phase 4 will be implemented following this initial release.

## Supplemental Tools

The **Composer** tool transforms your data into base Overture configurations, generating:

- **Elasticsearch Mappings**: Defines the structure and indexing settings for your data in Elasticsearch
- **Arranger UI Configs**: Configures the user interface for data exploration and visualization
- **Lectern Dictionary and Schema**: Creates data dictionaries and schemas for tabular data management
- **Song Schema**: Generates schema configurations for our file metadata

These configuration files provide a foundational setup for your Overture platform components, ensuring consistent data representation and interoperability.

The **Conductor** tool streamlines interactions with Overture APIs, offering capabilities such as:

- **Elasticsearch Management**

  - Update Elasticsearch mappings
  - Transform and load CSV data into Elasticsearch

- **Metadata and Schema Handling**

  - Validate and submit schema dictionaries to Lectern
  - Register Lectern dictionaries with Lyric

- **Data Management**
  - Upload tabular data to Lyric
  - Create Song studies
  - Update Song with analysis schemas
  - Upload and publish file data with Song and Score

The guides here provide detailed instructions for using Conductor. Since Conductor streamlines and abstracts interactions with Overture API endpoints, we will reference the specific endpoints used at each stage. To supplement this, we have integrated the [Overture Swagger docs and API pages](/swaggerDocs/overview) within this portal, allowing you to explore and interact with any API endpoint as needed.

**Note:** Swagger APIs will only be available when running the phases that include the respective service.

## Getting Started

**Note:** The following information will be redundant if you are reading from the Prelude documentation page.

**1. Clone the repository:** 

```
git clone -b prelude https://github.com/overture-stack/conductor.git
cd conductor
```

**2. Pre-deployment Check:** You can run `make Phase0` to run a pre-deployment check.

Pre-requisites and minimum requirements are as follows:

  - Docker Desktop 4.39.0+ with sufficient resources:
    - 8 cores CPU minimum
    - 8 GB memory
    - 2 GB swap
    - 64 GB virtual disk
  - Node.js 18+ and npm 9+


**3. Build the local stage UI image:** 

```
cd apps/stage
docker build -t stageimage:1.0 .
```

**4. Run the Phase1 deployment script from the root directory:** 

```
make phase1
```
**5. Access the Portal**

After startup, access the portal at: http://localhost:3000

You can find all Prelude documentation rendered in the documentation tab or from our [documentation site](https://docs.overture.bio/other-software/prelude).

## Support

If you have any questions, please reach out through our [relevant community support channels](https://docs.overture.bio/community/support).

- For public support, use GitHub issues
- For private inquiries, contact OICR Slack or contact@overture.bio

We are currently working on creating new resources to aid users transitioning into production. If you have any ideas or suggestions, feel free to post them to our [GitHub discussion forum](https://github.com/overture-stack/docs/discussions/categories/ideas).
