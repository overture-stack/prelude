# Overture Documentation Portal

A comprehensive documentation portal for the Overture data platform implementation, built with Next.js and featuring a responsive, mobile-friendly design with intuitive navigation.

## Overview

This documentation portal provides a structured, user-friendly interface for accessing Overture's Prelude documentation. It features:

- Responsive sidebar navigation with mobile support
- Markdown content rendering with automatic table of contents
- Section-based navigation with previous/next links
- Copy-to-clipboard functionality for headings
- Dynamic content loading

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
