# Overture Documentation Portal

Prelude is a toolkit designed for the planning and development stages of Overture data platform implementation. It helps teams incrementally build and validate platform requirements, enabling them to:

- Systematically verify requirements and user workflows
- Minimize technical overhead during planning and prototyping
- Create a comprehensive blueprint for production deployment

> [!IMPORTANT]
> Prelude is not intended for production environments. It serves as a preparatory tool to ensure successful production deployments. We are actively enhancing resources to support teams transitioning from Prelude to production.

We welcome feedback and suggestions—please share them via [our ideas forum](https://github.com/overture-stack/docs/discussions/new?category=ideas).

## Development Phases

Prelude is structured into four incremental phases:

![Development Phases](/docs/images/DevelopmentPhases.png "Prelude Development Phases")

| **Phase**                               | **Focus**                           | **Components**                    |
| --------------------------------------- | ----------------------------------- | --------------------------------- |
| **Phase 1:** Data Exploration & Theming | Data visualization in the portal    | Elasticsearch, Arranger, Stage    |
| **Phase 2:** Tabular Data Management    | Backend data storage and validation | Lyric, Lectern, Postgres, MongoDB |
| **Phase 3:** File Management            | File storage and metadata tracking  | Song, Score, Object Storage       |
| **_Phase 4:_** Identity & Access        | Security and user management        | Keycloak integration              |

**Phase 4** is not included in Prelude v1 and will be implemented in a future release.

## Supplemental Tools

### Composer

**Composer** transforms your data into base Overture configurations, generating:

- **Elasticsearch Mappings** – Defines the structure and indexing settings for your data
- **Arranger UI Configs** – Configures the user interface for data exploration and visualization
- **Lectern Dictionary Schema** – Creates data dictionaries and schemas for tabular data
- **Song Schema** – Generates schema configurations for file metadata

These configurations provide a foundation for Overture components, ensuring consistent data representation and interoperability.

### Conductor

**Conductor** streamlines interactions with Overture APIs, offering:

- **Elasticsearch Management**

  - Transform and load CSV data into Elasticsearch

- **Metadata and Schema Handling**

  - Validate and submit schema dictionaries to Lectern
  - Register Lectern dictionaries with Lyric

- **Data Management**

  - Upload tabular data to Lyric
  - Create Song studies
  - Update Song with analysis schemas
  - Upload and publish file data with Song and Score

The guides here provide detailed instructions for using Conductor.

## Getting Started

### Prerequisites

- **Docker Desktop 4.39.0+** with:
  - 8-core CPU minimum
  - 8 GB memory
  - 2 GB swap
  - 64 GB virtual disk
- **Node.js 18+ and npm 9+**

### First Steps

Start by running the pre-deployment check to ensure your environment is properly configured:

```bash
make phase0
```

This command will verify your system meets all requirements and provide guidance on any necessary adjustments.

### Deployment Options

The portal can be deployed in phases, with each phase adding additional functionality:

```bash
# Deploy Phase 1: Data Exploration & Theming
make phase1

# Deploy Phase 2: Tabular Data Management
make phase2

# Deploy Phase 3: File Management
make phase3

# Run Stage in development mode
make stage-dev

# Reset all containers and volumes
make reset
```

### Accessing the Portal

Once running, access the documentation portal at: [http://localhost:3000](http://localhost:3000)

## Documentation Structure

The documentation is organized into phases matching the Prelude development workflow:

- **Introduction**: Overview of the Prelude toolkit and its components
- **Phase One**: Data Exploration & Theming (Elasticsearch, Arranger, Stage)
- **Phase Two**: Tabular Data Management (Lyric, Lectern, Postgres, MongoDB)
- **Phase Three**: File Management (Song, Score, Object Storage)
- **Phase Four**: Identity & Access (Coming in future release)
- **Support**: How to get help and contribute

## Development

### Local Development Environment

To modify the documentation portal itself:

1. Clone the repository
2. Install dependencies:
   ```bash
   cd apps/stage
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```

### Updating Documentation Content

Documentation content is stored as Markdown files in the `public/docs` directory. To add or update content:

1. Files are prefixed with numbers (`00-`, `01-`, etc.) to control ordering
2. Each file should start with a top-level heading (`# Title`)
3. Place images in `public/docs/images/`
4. Use standard Markdown syntax for formatting

## Project Structure

The project follows a modular structure with two main applications: Conductor (for data management) and Stage (for the front-end portal).

```
├── apps/
│   ├── composer/                 # Config generation tool
│   │   └── src/                  # Source code
│   │       ├── cli/              # CLI interface
│   │       ├── commands/         # Command implementations
│   │       ├── services/         # Core functions for config generation
│   │       └── utils/            # Utility functions
│   │
│   ├── conductor/                # Data management tool
│   │   ├── src/                  # Source code
│   │   │   ├── cli/              # CLI interface
│   │   │   ├── commands/         # Command implementations
│   │   │   ├── services/         # Core services (ES, Lectern, etc.)
│   │   │   └── utils/            # Utility functions
│   │   ├── configs/              # Configuration files
│   │   │   ├── arrangerConfigs/  # Arranger UI configurations
│   │   │   ├── elasticsearchConfigs/ # Elasticsearch mappings
│   │   │   ├── lecternDictionaries/ # Data dictionaries
│   │   │   └── songSchemas/      # Song schemas
│   │   └── scripts/              # Deployment and service scripts
│   │       ├── deployments/      # Phase deployment scripts
│   │       └── services/         # Service management scripts
│   │
│   └── stage/                    # Frontend portal
│       ├── components/
│       │   ├── pages/            # Page-specific components
│       │   └── theme/            # Theming
│       ├── pages/                # Next.js pages
│       └── public/               # Static assets
│           └── docs/             # Markdown documentation files
│               └── images/       # Documentation images
│
├── configs/                      # Symlink to conductor configs
├── data/                         # Data files
└── docs/                         # Symlink to Stage docs
```

## Support

For assistance, reach out via the [community support channels](https://docs.overture.bio/community/support), for private inquiries email us at [contact@overture.bio](mailto:contact@overture.bio).
