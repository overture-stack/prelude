# Overview

Prelude is a comprehensive toolkit designed for the **planning and development stages** of data platform implementation. It enables teams to:

- Build and validate data platform requirements incrementally
- Systematically verify requirements and user workflows
- Minimize technical overhead during planning and prototype phases
- Create a blueprint for production deployment

**Note:** Prelude is **not a production environment**, but prepares you for successful production deployment.

## Development Phases

Prelude implements a phased architecture that grows with your project needs:

![Arch](/docs/images/arch.png "Phased Architecture")

| Phase                                   | Focus                                    | Components                        | Capabilities                                          |
| --------------------------------------- | ---------------------------------------- | --------------------------------- | ----------------------------------------------------- |
| **Phase 1:** Data Exploration & Theming | How your data is displayed in the portal | Elasticsearch, Arranger, Stage    | Display tabular data with search and filters          |
| **Phase 2:** Tabular Data Management    | Back-end data storage and validation     | Lyric, Lectern, Postgres, MongoDB | Schema validation, data submission, quality control   |
| **Phase 3:** File Management            | File storage and metadata tracking       | Song, Score, Object Storage       | Multi-part uploads, file versioning, metadata linking |
| **\*Phase 4:** Identity & Access        | Security and user management             | Keycloak integration              | Authentication, authorization, audit logging          |

**\*Phase 4**, will not be included in the Prelude version 1 release, phase 4 will be implemented following this initial relase.

## Core Tools

### Composer CLI

The **Composer** tool transforms your data into base Overture configurations:

- **Elasticsearch Configuration**: Build ES mappings with automatic type inference
- **Arranger UI Configuration**: Create Arranger configurations for search interfaces
- **Data Dictionary Generation**: Create Lectern dictionaries from CSV data files
- **Schema Creation**: Generate Song schemas from JSON metadata templates

### Conductor CLI

The **Conductor** tool provides workflow management commands simplifying interactions with APIs across all components:

- **Elasticsearch Management**: Upload CSV data, manage indices and templates
- **Schema Management**: Upload and validate data dictionaries via Lectern
- **Data Validation**: Register dictionaries with Lyric and validate data against schemas
- **File Management**: Upload, manifest, and publish files with Song and Score
- **Study Management**: Create and manage studies and their associated data within Song

## Getting Started

### 1. Prerequisites

- Docker Desktop 4.39.0+ with sufficient resources:
  - 8 cores CPU minimum
  - 8 GB memory
  - 2 GB swap
  - 64 GB virtual disk
- Node.js 18+ and npm 9+

### 2. Installation

```bash
# Clone the repository
git clone -b prelude https://github.com/overture-stack/conductor.git
cd conductor

# Build the Stage image
cd apps/stage
docker build -t stageimage:1.0 .
cd ../..
```

### 3. Launch the Platform

To begin, run `make phase1`

### 4. Access the Portal

After startup, access the portal at: http://localhost:3000

You can find all Prelude documentation rendered in the documentation tab or from our [documentation site](https://docs.overture.bio/other-software/prelude).

## Support

If you have any questions, please reach out through our [relevant community support channels](https://docs.overture.bio/community/support).

- For public support, use GitHub issues
- For private inquiries, contact OICR Slack or contact@overture.bio

We are currently working on creating new resources to aid users transitioning into production. If you have any ideas or suggestions, feel free to post them to our [GitHub discussion forum](https://github.com/overture-stack/docs/discussions/categories/ideas).
