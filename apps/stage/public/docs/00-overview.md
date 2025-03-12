# Overview  

## Overview  

**Prelude** is a toolkit designed for the **planning and development stages** of Overture data platform implementation. It helps teams incrementally build and validate platform requirements, enabling them to:  

- Systematically verify requirements and user workflows  
- Minimize technical overhead during planning and prototyping  
- Create a comprehensive blueprint for production deployment  

**Important:** Prelude is **not intended for production environments**. It serves as a preparatory tool to ensure successful production deployments. We are actively enhancing resources to support teams transitioning from Prelude to production.  

We welcome feedback and suggestions—please share them via our [ideas forum](https://github.com/overture-stack/docs/discussions/categories/ideas).  

## Development Phases  

Prelude is structured into four incremental phases:  

![Development Phases](/docs/images/architecture.png 'Prelude Development Phases')  

| **Phase**                                | **Focus**                               | **Components**                    |  
|-----------------------------------------|----------------------------------------|-----------------------------------|  
| **Phase 1:** Data Exploration & Theming | Data visualization in the portal      | Elasticsearch, Arranger, Stage   |  
| **Phase 2:** Tabular Data Management    | Backend data storage and validation   | Lyric, Lectern, Postgres, MongoDB |  
| **Phase 3:** File Management            | File storage and metadata tracking    | Song, Score, Object Storage      |  
| **_Phase 4:_** Identity & Access        | Security and user management         | Keycloak integration             |  

**Phase 4** is not included in Prelude v1 and will be implemented in a future release.  

## Supplemental Tools  

### Composer  

**Composer** transforms your data into base Overture configurations, generating:  

- **Elasticsearch Mappings** – Defines the structure and indexing settings for your data  
- **Arranger UI Configs** – Configures the user interface for data exploration and visualization  
- **Lectern Dictionary and Schema** – Creates data dictionaries and schemas for tabular data  
- **Song Schema** – Generates schema configurations for file metadata  

These configurations provide a foundation for Overture components, ensuring consistent data representation and interoperability.  

### Conductor  

**Conductor** streamlines interactions with Overture APIs, offering:  

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

The guides here provide detailed instructions for using Conductor. Since Conductor abstracts interactions with Overture APIs, we reference the relevant API endpoints at each phase. To supplement this, [Overture Swagger docs and API pages](/swaggerDocs/overview) are integrated within this portal for easy exploration and interaction.  

**Note:** Swagger APIs are only available when running phases that include the respective service.  

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
make Phase0
```  

**Requirements:**  

- **Docker Desktop 4.39.0+** with:  
  - 8-core CPU minimum  
  - 8 GB memory  
  - 2 GB swap  
  - 64 GB virtual disk  
- **Node.js 18+ and npm 9+**  

### 3. Build the local Stage UI image  

```sh
cd apps/stage
docker build -t stageimage:1.0 .
```  

### 4. Deploy Phase 1  

Run from the root directory:  

```sh
make phase1
```  

### 5. Access the Portal  

Once running, access the portal at: [http://localhost:3000](http://localhost:3000).  

All Prelude documentation is available in the **Documentation** tab here or on our [documentation site](https://docs.overture.bio/other-software/prelude).  

## Support  

For assistance, reach out via our [community support channels](https://docs.overture.bio/community/support):  

- **Public support:** Use GitHub issues  
- **Private inquiries:** Contact us via OICR Slack or [contact@overture.bio](mailto:contact@overture.bio)  

We’re actively working on resources to help teams transition to production. If you have suggestions, post them on our [GitHub discussion forum](https://github.com/overture-stack/docs/discussions/categories/ideas).  

