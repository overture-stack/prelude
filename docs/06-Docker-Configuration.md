# Docker Configuration

The `docker-compose.yml` file orchestrates all services and connects them to the configuration files generated in the previous steps. Here we'll walk through the key environment variables and service definitions you'd modify when adapting the portal to a new dataset.

## Overview

The docker-compose file manages six services, each responsible for one layer of the stack. Rather than hardcoding configuration into the images, the platform uses two mechanisms:

- **Environment variables** control runtime behaviour (credentials, ports, index names)
- **Volume mounts** inject the configuration files you generated in the previous step into the running containers

This means editing a config file on your host takes effect on the next container restart — no image rebuild required.

All services share a single internal Docker network (`platform-network`) and start in dependency order — PostgreSQL and Elasticsearch must be healthy before setup runs; setup must complete before Arranger and Stage start:

```yaml
services:
  setup:       # runs init scripts → creates PG tables + ES indices
  postgres:    # persistent relational storage
  elasticsearch: # search engine + index store
  arranger-datatable1: # GraphQL search API (one per dataset)
  stage:       # React portal frontend
  conductor-cli: # demo-only: loads sample data (not part of make platform)

networks:
  platform-network:
    driver: bridge
```

The configuration files you generated are mounted as volumes into the relevant containers:

```yaml
# setup container receives all config directories
setup:
  volumes:
    - ./setup:/setup   # includes postgresConfigs/ and elasticsearchConfigs/

# each arranger instance gets its own config directory
arranger-datatable1:
  volumes:
    - ./setup/configs/arrangerConfigs/datatable1:/app/apps/search-server/configs
```

Which maps to:

```
setup/configs/postgresConfigs/        →  setup container (table creation)
setup/configs/elasticsearchConfigs/   →  setup container (index creation)
setup/configs/arrangerConfigs/        →  arranger container (UI configuration)
```

> **Note:** The `conductor-cli` service is used only by `make demo` to load the sample dataset. It is not part of the `make platform` workflow — for loading your own data, see [07-Loading-Data.md](07-Loading-Data.md).

> **Note:** The `setup` container is backed by a set of shell scripts under `setup/scripts/`. These handle the sequencing of initialization tasks — creating PostgreSQL tables, creating Elasticsearch indices, running health checks against each service, and signalling when the platform is ready. You don't need to read or modify these scripts during this workshop; they run automatically when you invoke `make platform` or `make demo`. They are there if you need to extend or debug the initialization process later.

## A) Setup Service: Configuration

The `setup` service runs initialization scripts that create PostgreSQL tables and Elasticsearch indices. It reads configuration from environment variables:

```yaml
# PostgreSQL Configuration
POSTGRES_CONFIGS_DIR: setup/configs/postgresConfigs # Directory containing SQL schema files
POSTGRES_HOST: postgres
POSTGRES_PORT: 5432
POSTGRES_DB: ${POSTGRES_DB:-overtureDb}
POSTGRES_USER: ${POSTGRES_USER:-admin}
POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-admin123}

# Elasticsearch Index Configuration
ES_INDEX_COUNT: 1 # Number of indices to create

# First index
ES_INDEX_0_NAME: datatable1-index
ES_INDEX_0_TEMPLATE_FILE: setup/configs/elasticsearchConfigs/datatable1-mapping.json
ES_INDEX_0_TEMPLATE_NAME: datatable1-index
ES_INDEX_0_ALIAS_NAME: datatable1_centric
```

**When adding a second dataset**, increment the count and add another block:

```yaml
ES_INDEX_COUNT: 2

# Second index
ES_INDEX_1_NAME: datatable2-index
ES_INDEX_1_TEMPLATE_FILE: setup/configs/elasticsearchConfigs/datatable2-mapping.json
ES_INDEX_1_TEMPLATE_NAME: datatable2-index
ES_INDEX_1_ALIAS_NAME: datatable2_centric
```

The setup service also defines the Arranger services it should verify during startup:

```yaml
# Arranger Services Configuration
ARRANGER_COUNT: 1
ARRANGER_0_URL: http://arranger-datatable1:5050
# ARRANGER_1_URL: http://arranger-datatable2:5051  # Uncomment for second dataset
```

## B) PostgreSQL Service: Persistent Storage

PostgreSQL stores your data persistently. The setup service auto-discovers and executes all `.sql` files from `setup/configs/postgresConfigs/` to create tables:

```yaml
postgres:
  image: postgres:15-alpine
  restart: unless-stopped
  environment:
    POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-admin123}
    POSTGRES_USER: ${POSTGRES_USER:-admin}
    POSTGRES_DB: ${POSTGRES_DB:-overtureDb}
  volumes:
    - postgres-data:/var/lib/postgresql/data
```

The `postgres-data` volume ensures your data persists across container restarts. Credentials use `${VARIABLE:-default}` syntax — Docker Compose reads actual values from the `.env` file if it exists, falling back to the workshop defaults. For production, create a `.env` file with strong passwords (see `.env.example`).

> **Note:** PostgreSQL's port is bound to `127.0.0.1:5435` — accessible from your local machine for debugging but not from the network. Other containers reach it over the Docker network by service name (`postgres:5432`). For full production lockdown, remove the `ports:` line entirely.

**When adding a second dataset**, add a new SQL file to `setup/configs/postgresConfigs/` (e.g., `datatable2.sql`). The setup service will discover and execute it automatically, no changes to docker-compose.yml are needed for the Postgres service itself.

## C) Arranger Service: Search API

Each data table requires its own Arranger service instance. The demo includes one:

```yaml
arranger-datatable1:
  image: ghcr.io/overture-stack/arranger-server:3.0.0-beta.36
  container_name: arranger-datatable1
  restart: unless-stopped
  volumes:
    - ./setup/configs/arrangerConfigs/datatable1:/app/modules/server/configs
  environment:
    ES_HOST: http://elasticsearch:9200
    ES_USER: ${ES_USER:-elastic}
    ES_PASS: ${ES_PASSWORD:-myelasticpassword}
    ES_ARRANGER_SET_INDEX: datatable1_arranger_set
    PORT: 5050
```

> **Note:** Arranger's port is bound to `127.0.0.1:5050` — accessible locally for debugging but not from the network. Stage reaches it over the Docker network (`http://arranger-datatable1:5050`).

The volume mount is what connects the Arranger configuration files you generated to the running service. When you modified `facets.json` in the previous section, you were editing the files that this container reads.

**Adding a second Arranger instance** for another dataset:

```yaml
arranger-datatable2:
  image: ghcr.io/overture-stack/arranger-server:3.0.0-beta.36
  container_name: arranger-datatable2
  restart: unless-stopped
  volumes:
    - ./setup/configs/arrangerConfigs/datatable2:/app/modules/server/configs
  environment:
    ES_HOST: http://elasticsearch:9200
    ES_USER: ${ES_USER:-elastic}
    ES_PASS: ${ES_PASSWORD:-myelasticpassword}
    ES_ARRANGER_SET_INDEX: datatable2_arranger_set # Unique set index
    PORT: 5051 # Must match internal port
  networks:
    - platform-network
```

Each Arranger instance must have:

- A **unique port** (both in `ports` and `PORT` env var)
- A **unique container name**
- Its **own config directory** mounted as a volume
- A **unique `ES_ARRANGER_SET_INDEX`**

## D) Stage Service: Portal Frontend

Stage connects to Arranger instances via environment variables:

```yaml
stage:
  restart: unless-stopped
  environment:
    # Portal identity (reads from .env, falls back to defaults)
    NEXT_PUBLIC_LAB_NAME: ${NEXT_PUBLIC_LAB_NAME:-My Data Portal}
    NEXT_PUBLIC_ADMIN_EMAIL: ${NEXT_PUBLIC_ADMIN_EMAIL:-admin@example.org}

    # Datatable 1 — Arranger connection
    NEXT_PUBLIC_ARRANGER_DATATABLE_1_API: http://arranger-datatable1:5050
    NEXT_PUBLIC_ARRANGER_DATATABLE_1_DOCUMENT_TYPE: file
    NEXT_PUBLIC_ARRANGER_DATATABLE_1_INDEX: datatable1_centric
    NEXT_PUBLIC_DATATABLE_1_EXPORT_ROW_ID_FIELD: submission_metadata.submission_id

    # Auth (generate a strong secret for production)
    NEXTAUTH_SECRET: ${NEXTAUTH_SECRET:-your-secure-secret-here}
```

**For a second data table**, add another set of environment variables:

```yaml
# Datatable 2 — Arranger connection
NEXT_PUBLIC_ARRANGER_DATATABLE_2_API: http://arranger-datatable2:5051
NEXT_PUBLIC_ARRANGER_DATATABLE_2_DOCUMENT_TYPE: file
NEXT_PUBLIC_ARRANGER_DATATABLE_2_INDEX: datatable2_centric
NEXT_PUBLIC_DATATABLE_2_EXPORT_ROW_ID_FIELD: submission_metadata.submission_id
```

Stage natively supports up to 5 data table connections following this naming pattern. This can be extended with some custom development.

## Applying Changes

Since you previously ran `make demo`, the environment contains demo data that needs to be cleared before loading your own. Run a full reset first:

```bash
make reset
```

This wipes all Elasticsearch and PostgreSQL data, stops all containers, and returns the environment to a clean state. Then bring the platform back up with:

```bash
make platform
```

> For future configuration changes (once your own data is loaded), `make restart` is sufficient, it reloads configs without wiping data.

### Troubleshooting

If services don't start correctly after changes:

```bash
# Check container logs
docker logs setup
docker logs postgres
docker logs arranger-datatable1
docker logs stage

# Verify PostgreSQL is healthy
docker exec postgres pg_isready -U admin

# Verify Elasticsearch is healthy
curl -u elastic:myelasticpassword http://localhost:9200/_cluster/health?pretty

# Full reset (caution: deletes all data)
make reset
```

## Checkpoint

Before proceeding, confirm:

- [ ] You can identify each service in `docker-compose.yml` and understand its role
- [ ] You understand how config files are mounted into containers via `volumes`
- [ ] You ran `make reset` followed by `make platform` to clear demo data and start fresh
- [ ] The portal is accessible at http://localhost:3000

> **Stuck?** Run `docker ps` to check which containers are running. If a container exited, run `docker logs <container-name>` to see why.

---

## Break: 3:25–3:30 (5 min)

Good time to stretch, grab a coffee, and let any running restarts finish.

---

> **Next:** With the infrastructure configured, let's load data into the portal.
