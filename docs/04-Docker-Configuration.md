# Docker Configuration

In the previous steps you generated three sets of configuration files: a PostgreSQL schema, an Elasticsearch mapping, and Arranger configs. This section walks through how `docker-compose.yml` picks those files up and wires them into the running services. Understanding this wiring will help you adapt the platform to your own data and troubleshoot issues if they arise. The platform uses two mechanisms to connect your configuration to the containers:

- **Volume mounts** inject the config files you generated directly into the containers at startup, no image rebuild required, changes take effect on the next restart
- **Environment variables** control runtime behaviour such as credentials, ports, and index names

## Step 1: Setup

The `setup` service runs initialization scripts that create PostgreSQL tables and Elasticsearch indices from your generated config files. The highlighted variables are the key values that connect your configuration to the running services:

```yaml showLineNumbers
# PostgreSQL Configuration
POSTGRES_CONFIGS_DIR: setup/configs/postgresConfigs
POSTGRES_HOST: postgres
POSTGRES_PORT: 5432
# highlight-start
POSTGRES_DB: ${POSTGRES_DB:-overtureDb} # update if changing the database name
POSTGRES_USER: ${POSTGRES_USER:-admin} # update if changing credentials
POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-admin123}
# highlight-end

# Elasticsearch Index Configuration
ES_INDEX_COUNT: 1

# highlight-start
ES_INDEX_0_NAME: datatable1-index # must match the index name in your mapping file
ES_INDEX_0_TEMPLATE_FILE: setup/configs/elasticsearchConfigs/datatable1-mapping.json # path to your mapping
ES_INDEX_0_TEMPLATE_NAME: datatable1-index
ES_INDEX_0_ALIAS_NAME: datatable1_centric # must match the alias in your mapping and base.json
# highlight-end
```

| Variable                    | What it controls                                                                              |
| --------------------------- | --------------------------------------------------------------------------------------------- |
| `POSTGRES_DB/USER/PASSWORD` | Database credentials, must be consistent across all services that connect to PostgreSQL       |
| `ES_INDEX_0_NAME`           | The Elasticsearch index name, corresponds to the value passed to `-i` when running Composer   |
| `ES_INDEX_0_TEMPLATE_FILE`  | Path to your generated mapping JSON, tells setup where to find the index template             |
| `ES_INDEX_0_ALIAS_NAME`     | The alias Arranger queries, must match `aliases` in your mapping and `esIndex` in `base.json` |

:::info
The `setup` container is backed by shell scripts under `setup/scripts/` that handle sequencing, health checks, and initialization signalling. You do not need to modify these during the workshop, they run automatically with `make platform` or `make demo`.
:::

:::tip
Multiple datasets are supported, each gets its own index block following the same `ES_INDEX_1_*` pattern. This is beyond the scope of this workshop, but reach out via [contact@overture.bio](mailto:contact@overture.bio) if you'd like guidance on multi-dataset setups afterwards.
:::

## Step 2: PostgreSQL

PostgreSQL stores your data persistently. The setup service auto-discovers and executes all `.sql` files from `setup/configs/postgresConfigs/` to create tables. These credentials must be consistent across all services that connect to the database:

```yaml showLineNumbers
postgres:
  image: postgres:15-alpine
  restart: unless-stopped
  environment:
    # highlight-start
    POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-admin123} # update if changing credentials
    POSTGRES_USER: ${POSTGRES_USER:-admin} # update if changing credentials
    POSTGRES_DB: ${POSTGRES_DB:-overtureDb} # update if changing the database name
    # highlight-end
  volumes:
    - postgres-data:/var/lib/postgresql/data
```

| Variable            | What it controls                                                                 |
| ------------------- | -------------------------------------------------------------------------------- |
| `POSTGRES_PASSWORD` | Database password, must match the value set in the setup service                 |
| `POSTGRES_USER`     | Database user, must match the value set in the setup service                     |
| `POSTGRES_DB`       | Database name, must match the value set in the setup service and your SQL schema |

The `postgres-data` volume ensures your data persists across container restarts. Credentials use `${VARIABLE:-default}` syntax, Docker Compose reads actual values from the `.env` file if it exists, falling back to the workshop defaults. For production, create a `.env` file with strong passwords (see `.env.example`).

:::info
PostgreSQL's port is bound to `127.0.0.1:5435`, accessible from your local machine for debugging but not from the network. Other containers reach it over the Docker network by service name (`postgres:5432`). For full production lockdown, remove the `ports:` line entirely.
:::

:::tip
Adding a second dataset only requires a new SQL file in `setup/configs/postgresConfigs/`, the setup service discovers and executes all `.sql` files automatically, no changes to `docker-compose.yml` are needed. This is beyond the scope of this workshop, but reach out via [contact@overture.bio](mailto:contact@overture.bio) if you'd like guidance afterwards.
:::

## Step 3: Arranger

Each data table requires its own Arranger service instance. The volume mount is what connects the Arranger configuration files you generated in the previous section to the running container, and the environment variables tell it how to reach Elasticsearch:

```yaml showLineNumbers
arranger-datatable1:
  image: ghcr.io/overture-stack/arranger-server:3.0.0-beta.36
  container_name: arranger-datatable1
  restart: unless-stopped
  volumes:
    # highlight-next-line
    - ./setup/configs/arrangerConfigs/datatable1:/app/modules/server/configs
  environment:
    ES_HOST: http://elasticsearch:9200
    # highlight-start
    ES_USER: ${ES_USER:-elastic} # update if changing Elasticsearch credentials
    ES_PASS: ${ES_PASSWORD:-myelasticpassword} # update if changing Elasticsearch credentials
    ES_ARRANGER_SET_INDEX: datatable1_arranger_set # must be unique per Arranger instance
    # highlight-end
    PORT: 5050
```

| Setting                 | What it controls                                                                            |
| ----------------------- | ------------------------------------------------------------------------------------------- |
| Volume mount path       | Which Arranger config directory is loaded, the `datatable1` segment matches your table name |
| `ES_USER` / `ES_PASS`   | Credentials used to connect to Elasticsearch                                                |
| `ES_ARRANGER_SET_INDEX` | Internal Arranger bookmarks index, must be unique per Arranger instance                     |

:::info
Arranger's port is bound to `127.0.0.1:5050`, accessible locally for debugging but not from the network. Stage reaches it over the Docker network (`http://arranger-datatable1:5050`).
:::

:::tip
Adding a second Arranger instance requires a new service block with a unique port, container name, config directory, and `ES_ARRANGER_SET_INDEX`. This is beyond the scope of this workshop, but reach out via [contact@overture.bio](mailto:contact@overture.bio) if you'd like guidance afterwards.
:::

## Step 4: Stage

Stage connects to Arranger via environment variables. These settings control the portal's identity and tell Stage which Arranger instance to query for each data table:

```yaml showLineNumbers
stage:
  restart: unless-stopped
  environment:
    # highlight-start
    NEXT_PUBLIC_LAB_NAME: ${NEXT_PUBLIC_LAB_NAME:-My Data Portal} # portal display name
    NEXT_PUBLIC_ADMIN_EMAIL: ${NEXT_PUBLIC_ADMIN_EMAIL:-admin@example.org} # contact email shown in the portal
    # highlight-end

    # highlight-start
    NEXT_PUBLIC_ARRANGER_DATATABLE_1_API: http://arranger-datatable1:5050 # must match Arranger service name and port
    NEXT_PUBLIC_ARRANGER_DATATABLE_1_DOCUMENT_TYPE: file
    NEXT_PUBLIC_ARRANGER_DATATABLE_1_INDEX: datatable1_centric # must match ES_INDEX_0_ALIAS_NAME in setup
    NEXT_PUBLIC_DATATABLE_1_EXPORT_ROW_ID_FIELD: submission_metadata.submission_id
    # highlight-end

    NEXTAUTH_SECRET: ${NEXTAUTH_SECRET:-your-secure-secret-here}
```

| Variable                                      | What it controls                                                                   |
| --------------------------------------------- | ---------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_LAB_NAME`                        | The display name shown in the portal header                                        |
| `NEXT_PUBLIC_ADMIN_EMAIL`                     | Contact email shown in the portal footer                                           |
| `NEXT_PUBLIC_ARRANGER_DATATABLE_1_API`        | The URL Stage uses to reach Arranger, must match the service name and port         |
| `NEXT_PUBLIC_ARRANGER_DATATABLE_1_INDEX`      | The Elasticsearch alias Stage queries, must match `ES_INDEX_0_ALIAS_NAME` in setup |
| `NEXT_PUBLIC_DATATABLE_1_EXPORT_ROW_ID_FIELD` | The field used as the unique row identifier for TSV export                         |

:::tip
Stage natively supports up to 5 data table connections following the `DATATABLE_1`, `DATATABLE_2` naming pattern. Adding a second connection is beyond the scope of this workshop, but reach out via [contact@overture.bio](mailto:contact@overture.bio) if you'd like guidance afterwards.
:::

## Applying Changes

Since you previously ran `make demo`, the environment contains demo data that needs to be cleared before loading your own. Run a full reset first:

```bash
make reset
```

This wipes all Elasticsearch and PostgreSQL data, stops all containers, and returns the environment to a clean state. Then bring the platform back up with:

```bash
make platform
```

:::info
For future configuration changes (once your own data is loaded), `make restart` is sufficient, it reloads configs without wiping data. If you wish to wipe the data as-well run `make reset`
:::

#### Troubleshooting

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

**Stuck?** Run `docker ps` to check which containers are running. If a container exited, run `docker logs <container-name>` to see why.

**Next:** With the infrastructure configured, let's load data into the portal.
