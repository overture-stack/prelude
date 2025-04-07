# Prelude - Version 1.0.0-beta

Prelude is a toolkit for the planning and development stages of Overture data platform implementation. It helps teams incrementally build and validate platform requirements.

> [!IMPORTANT]
> Prelude is not intended for production environments. It serves as a preparatory tool to ensure successful production deployments.

We welcome feedback and suggestions—please share them via [our ideas forum](https://github.com/overture-stack/docs/discussions/new?category=ideas).

## Development Phases

Prelude is structured into four incremental phases:

![Development Phases](apps/stage/public/docs/images/DevelopmentPhases.png "Prelude Development Phases")

| **Phase**                               | **Focus**                           | **Components**                    |
| --------------------------------------- | ----------------------------------- | --------------------------------- |
| **Phase 1:** Data Exploration & Theming | Data visualization in the portal    | Elasticsearch, Arranger, Stage    |
| **Phase 2:** Tabular Data Management    | Backend data storage and validation | Lyric, Lectern, Postgres, MongoDB |
| **Phase 3:** File Management            | File storage and metadata tracking  | Song, Score, Object Storage       |
| **_Phase 4:_** Identity & Access        | Security and user management        | Keycloak integration              |

**Phase 4** will be implemented in a future release.

## Supplemental Tools

**Composer** transforms your data into base Overture configurations, generating:

- **Elasticsearch Mappings** – Defines the structure and indexing settings for your data
- **Arranger UI Configs** – Configures the user interface for data exploration and visualization
- **Lectern Dictionary Schema** – Creates data dictionaries and schemas for tabular data
- **Song Schema** – Generates schema configurations for file metadata

These configurations provide a foundation for Overture components, ensuring consistent data representation and interoperability.

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

## Getting Started

You will need:

- **Docker Desktop 4.39.0+** with:
  - 8-core CPU minimum
  - 8 GB memory
  - 2 GB swap
  - 64 GB virtual disk
- **Node.js 20.18.1+ and npm 9+**

Run the pre-deployment check to verify your environment:

| OS          | Command           |
| ----------- | ----------------- |
| Linux/macOS | `make phase0`     |
| Windows     | `make.bat phase0` |

The CLI will provide you with instructions on next steps.

### Deployment Options

| Phase                 | Description                      | Linux/macOS      | Windows              |
| --------------------- | -------------------------------- | ---------------- | -------------------- |
| **Phase 1**           | Data Exploration & Theming       | `make phase1`    | `make.bat phase1`    |
| **Phase 2**           | Tabular Data Management          | `make phase2`    | `make.bat phase2`    |
| **Phase 3**           | File Management                  | `make phase3`    | `make.bat phase3`    |
| **Development**       | Run Stage in development mode    | `make stage-dev` | `make.bat stage-dev` |
| **System Management** | Reset all containers and volumes | `make reset`     | `make.bat reset`     |

### Available Commands

| Command     | Description                                   |
| ----------- | --------------------------------------------- |
| `help`      | Display available commands                    |
| `phase0`    | Run pre-deployment checks                     |
| `phase1`    | Start Phase 1 deployment                      |
| `phase2`    | Start Phase 2 deployment                      |
| `phase3`    | Start Phase 3 deployment                      |
| `stage-dev` | Start Stage development environment           |
| `down`      | Gracefully shutdown all containers            |
| `reset`     | Remove all containers and volumes (DATA LOSS) |

## Accessing the Portal

Once running, you can access the portal at: [http://localhost:3000](http://localhost:3000)

The documentation found on the portal and within the `/docs` folder is organized into phases matching the Prelude development workflow:

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
