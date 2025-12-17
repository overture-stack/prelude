# Researcher Data Exploration Platform

A React-based data exploration interface that integrates with Arranger and Elasticsearch for interactive data visualization and filtering.

<img width="3024" height="1712" alt="Data Portal Screenshot" src="https://github.com/user-attachments/assets/6ffab42c-dcd0-4067-a059-4c8a777bdcb1" />

## Quick Start

### Demo Mode (Production-like)

Run the full application with all services containerized:

```bash
make demo
```

The portal will be available at http://localhost:3000

### Development Mode

Run backend services in Docker, custom-ui locally with hot-reload:

```bash
# Terminal 1: Start backend services
make dev

# Terminal 2: Start development server
cd apps/custom-ui
npm install  # first time only
npm run dev
```

The portal will be available at http://localhost:3002

## Prerequisites

- Docker Desktop 4.39.0+
- Node.js 20.18.1+ and npm 9+
- 16GB+ RAM available for Docker
- 20GB+ disk space

---

## Table of Contents

- [Architecture](#architecture)
- [Commands Reference](#commands-reference)
- [Development Guide](#development-guide)
- [Data Management](#data-management)
- [Configuration](#configuration)
- [Troubleshooting](#troubleshooting)

---

## Architecture

### High-Level Overview

The platform consists of three main components:

```
┌─────────────────┐
│   Custom UI     │  React + Vite frontend
│   (port 3000)   │  Interactive charts & filters
└────────┬────────┘
         │ GraphQL
         v
┌─────────────────┐
│    Arranger     │  GraphQL API gateway
│   (port 5050)   │  Query translation
└────────┬────────┘
         │ REST API
         v
┌─────────────────┐
│ Elasticsearch   │  Search & aggregation engine
│   (port 9200)   │  Data storage
└─────────────────┘
```

### Data Flow

1. **User Interaction**: User clicks chart bars, selects facets, or updates filters
2. **SQON Update**: Filter state (SQON) updates and broadcasts to all components via React Context
3. **GraphQL Requests**: Charts and facets automatically query Arranger with updated filters
4. **Query Translation**: Arranger converts GraphQL to Elasticsearch aggregation queries
5. **Data Aggregation**: Elasticsearch executes queries and returns bucketed results
6. **UI Update**: Components re-render with new data

<img width="2042" height="1286" alt="Architecture Diagram" src="https://github.com/user-attachments/assets/b76f35ec-6e55-4c2a-a01f-ad3289bf1c83" />

### Services

| Service       | Port                      | Purpose              |
| ------------- | ------------------------- | -------------------- |
| Custom UI     | 3000 (demo)<br>3002 (dev) | Frontend application |
| Arranger      | 5050                      | GraphQL API          |
| Elasticsearch | 9200                      | Search engine        |

---

## Commands Reference

### Development

```bash
make demo       # Start full demo deployment with containerized UI
make dev        # Start backend services only (run UI separately)
make start      # Start existing services (no rebuild)
make restart    # Restart all services
make down       # Stop all services (preserves data)
make status     # Show service status
```

### Maintenance

```bash
make rebuild       # Rebuild and redeploy custom-ui only
make check-space   # Check Docker disk usage
make reset         # Remove ALL containers and data (destructive)
```

### Help

```bash
make help       # Show all available commands
```

---

## Development Guide

### Directory Structure

```
prelude/
├── apps/
│   ├── custom-ui/              # React frontend application
│   │   ├── src/
│   │   │   ├── components/     # Reusable UI components (Stats, Facets, etc.)
│   │   │   ├── constants/      # External paths and constants
│   │   │   ├── pages/          # Chart components (BirthSexChart, etc.)
│   │   │   ├── theme/          # UI theme & styling
│   │   │   ├── utils/          # Helper functions (arrangerFetcher, etc.)
│   │   │   ├── App.tsx         # Main application component
│   │   │   └── vite-env.d.ts   # TypeScript environment types
│   │   ├── public/             # Static assets
│   │   └── Dockerfile          # Production build configuration
│   │
│   ├── composer/               # Legacy data composer service
│   │   └── src/                # Composer source code
│   │
│   ├── conductor/              # Data upload CLI tool
│   │   ├── src/                # Conductor source code
│   │   └── Dockerfile          # Conductor container build
│   │
│   └── setup/                  # Deployment & configuration
│       ├── configs/
│       │   ├── arrangerConfigs/    # Arranger settings
│       │   │   ├── base.json       # Index and document type
│       │   │   ├── extended.json   # Field display mappings
│       │   │   ├── facets.json     # Facet configuration
│       │   │   └── table.json      # Table columns
│       │   └── indexConfigs/       # Elasticsearch mappings
│       │       └── demo-mapping.json
│       ├── scripts/
│       │   ├── deployments/        # Deployment scripts
│       │   │   ├── demo.sh         # Full demo deployment
│       │   │   └── dev.sh          # Dev backend only
│       │   └── services/           # Service health checks & setup
│       │       ├── arranger/
│       │       ├── elasticsearch/
│       │       ├── custom-ui/
│       │       └── utils/
│       └── volumes/                # Health check files
│
├── configs/                    # Symlink to apps/setup/configs
├── data/                       # Sample datasets
│   └── demodata.csv           # Demo participant data
├── docs/                       # Documentation
├── docker-compose.yml          # Service orchestration
└── Makefile                    # Build commands
```

### Local Development Workflow

1. **Make code changes** in `apps/custom-ui/src/`
2. **Changes auto-reload** in browser (dev mode only)
3. **Test with real data** from backend services
4. **Commit changes** when ready

### Backend Configuration Changes

After modifying Arranger configs or Elasticsearch mappings:

```bash
make down    # Stop services
make dev     # Restart with new configs
```

### Adding a New Chart

1. Create chart component in `apps/custom-ui/src/pages/`:

```tsx
import { BarChart } from "@overture-stack/arranger-charts";

const MyChart = () => {
  const { sqon, setSQON } = useArrangerData({ callerName: "MyChart" });

  return (
    <BarChart
      fieldName="data__myfield" // Must match Arranger config
      handlers={{
        onClick: (config) => {
          // Handle filter toggle
        },
      }}
    />
  );
};
```

2. Add field to Arranger facets config (`apps/setup/configs/arrangerConfigs/facets.json`)
3. Add field to Elasticsearch mapping (`apps/setup/configs/indexConfigs/demo-mapping.json`)
4. Restart services to apply config changes

---

## Data Management

### Uploading Data

Data is uploaded via the Conductor CLI during deployment:

```yaml
# Configured in docker-compose.yml
conductor-cli:
  command: |
    node dist/main.js upload \
      -f /data/demodata.csv \
      -t demo \
      -i demo-index
```

### Data Location

- **CSV Files**: `data/demodata.csv`
- **Elasticsearch**: Docker volume `index-data`

### Field Name Requirements

**IMPORTANT**: All field names must be lowercase for consistency.

```json
// Correct - lowercase
{
  "participantid": { "type": "keyword" },
  "birthsex": { "type": "keyword" }
}

// Incorrect - camelCase
{
  "participantId": { "type": "keyword" },
  "birthSex": { "type": "keyword" }
}
```

### Accessing Data Directly

```bash
# Elasticsearch
curl http://localhost:9200/demo-index/_search?pretty

# GraphQL Apollo
http://localhost:5050/graphql/apollo

# View using Elasticvue (if installed)
```

## Configuration

### Environment Variables

Custom UI build-time variables (in `docker-compose.yml`):

```yaml
custom-ui:
  build:
    args:
      VITE_ARRANGER_API: http://localhost:5050 # Arranger API URL
      VITE_DOCUMENT_TYPE: file # Arranger document type
      VITE_INDEX_NAME: demo_centric # Elasticsearch index alias
```

### Arranger Configuration

Located in `apps/setup/configs/arrangerConfigs/`:

- **base.json**: Index and document type
- **extended.json**: Field display names and mappings
- **facets.json**: Facet panel configuration
- **table.json**: Table column configuration

### Elasticsearch Mapping

Located in `apps/setup/configs/indexConfigs/demo-mapping.json`:

```json
{
  "index_patterns": ["demo-*"],
  "aliases": {
    "demo_centric": {} // Alias used by Arranger
  },
  "mappings": {
    "properties": {
      "data": {
        "properties": {
          "participantid": { "type": "keyword" },
          "birthsex": { "type": "keyword" }
          // ... more fields
        }
      }
    }
  }
}
```

### Resource Limits

Configured in `docker-compose.yml`:

```yaml
elasticsearch:
  deploy:
    resources:
      limits:
        cpus: "6"
        memory: 16G
      reservations:
        cpus: "2"
        memory: 8G
  environment:
    - "ES_JAVA_OPTS=-Xms8g -Xmx8g" # Heap size
```

## OpenSearch Migration (Future)

The platform is currently configured for Elasticsearch 7.17.10. When Arranger adds OpenSearch support, migration will involve:

1. Uncommenting OpenSearch service in `docker-compose.yml`
2. Updating environment variables to use `OPENSEARCH_*` instead of `ELASTICSEARCH_*`
3. Updating Arranger `ES_HOST` to point to OpenSearch
4. Updating deployment scripts to use OpenSearch service scripts (these have already be made)
5. Rebuilding: `make reset && make demo`

Both services use identical resource allocation and the same `index-data` volume name for easy migration.
