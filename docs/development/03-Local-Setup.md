# Local Setup

This section walks through standing up the full stack locally for development and testing.

### Clone and start the platform

```bash
git clone --recurse-submodules https://github.com/overture-stack/prelude.git
cd prelude
make demo
```

This starts all services (OpenSearch, PostgreSQL, Arranger, the Arranger MCP server, and Stage) and loads the sample catalogues. When all services are healthy, open the portal at **http://localhost:3000** (the stack does not launch a browser for you).

Verify Arranger is running:

```bash
curl http://localhost:5050/introspection
```

You should see a JSON response listing the loaded catalogues: `correlation`, `expression`, `mutation`, `protein`, `fixture`, and `donor`.

### The MCP server

In the demo, the MCP server runs automatically as the `arranger-mcp` container, reachable over Streamable HTTP at `http://localhost:3100/mcp`. Confirm it is up:

```bash
docker ps | grep arranger-mcp        # listening on port 3100
docker logs arranger-mcp             # should show it connected to Arranger
```

You do not need to run it from source for the demo. To develop the server itself, see the [MCP Server Developer Guide](./02-MCP-Developer-Guide.md).

### Connect your MCP host

Follow the [MCP Host Setup guide](../user/01-Setup.md) to connect LM Studio or another MCP host to the running server.

### Stopping the stack

```bash
make down
```

To reset all data:

```bash
make reset
```

## Adding a data table

A "data table" (e.g. `correlation`, `mutation`) spans several layers. Most are driven by
file/folder **naming convention** from a single table name (`<name>`), but the Stage
portal uses a **fixed set of 5 numbered slots** (`DATATABLE_1`..`DATATABLE_5`) that are
hardcoded in its source — so adding a *new* table beyond the existing ones requires app
changes, not just config. Work through this checklist in order.

Convention-driven layers (just add the file/folder — nothing else to wire):

| # | Location                                          | What to add                                                              |
| - | ------------------------------------------------- | ------------------------------------------------------------------------ |
| 1 | `configs/opensearch/<name>-mapping.json`          | Index mapping. Creates index `<name>-index`, alias `<name>_centric`. Indices are auto-discovered from this directory — no per-index env var. |
| 2 | `configs/arranger/<name>/`                        | Arranger catalogue (`base.json`, `extended.json`, `facets.json`, `table.json`, `matchbox.json`). Served at `http://arranger:5050/<name>`. |
| 3 | `data/tables/<name>.csv` + `DATA_TABLES` in `docker-compose.yml` (conductor-cli) | Sample data + the table name in the upload loop. |

Stage portal layers (a table is shown via a **fixed slot `N`, 1–5**):

| # | Location                                                   | What to add                                                                 |
| - | ---------------------------------------------------------- | --------------------------------------------------------------------------- |
| 4 | `docker-compose.yml` (stage service)                        | The `NEXT_PUBLIC_ARRANGER_DATATABLE_N_*` block: `_API` → `http://arranger:5050/<name>`, `_INDEX` → `<name>_centric`, `_DOCUMENT_TYPE` → `records`. |
| 5 | `apps/stage/next.config.js`                                 | A `DATATABLE_N` group under `publicRuntimeConfig` (forwards the env vars at runtime). |
| 6 | `apps/stage/global/utils/constants.ts`                      | `DATATABLE_N_ARRANGER: urlJoin(PROXY_API_PATH, 'dataset_N_arranger')` in `INTERNAL_API_PROXY`. |
| 7 | `apps/stage/pages/api/[...proxy].ts`                         | A routing branch mapping `DATATABLE_N_ARRANGER` → `NEXT_PUBLIC_ARRANGER_DATATABLE_N_API`. |
| 8 | `apps/stage/pages/<name>Table/index.tsx`                    | The page component (bespoke per table — quick-search fields, export config). References slot `N`. The `*Table` folder name is auto-discovered into the navbar by `global/utils/dataTablesDiscovery.ts`. |

After app changes, rebuild Stage: `make rebuild`. Index/arranger/data changes alone only
need `make restart`.

> The 5-slot ceiling is a Stage-source constraint, not a config one. Going beyond 5 tables
> means extending the numbered slots in steps 5–7 (and the `publicRuntimeConfig` block) to
> `DATATABLE_6`, etc.

## Troubleshooting

### A catalogue returns HTTP 500 on its GraphQL endpoint after a cold boot

On a cold start, setup may report a catalogue as unhealthy with a GraphQL error like:

```
Error: GraphQL schema unavailable or invalid at /correlation/graphql
Response: {"message":"resource_already_exists_exception: ... index [arranger-sets/...] already exists", ...}
```

**Cause:** all catalogues boot concurrently and each tries to create the shared
`arranger-sets` index. It's a check-then-act race — most catalogues see the index
already exists, but one occasionally calls create anyway and the non-idempotent
create throws, aborting GraphQL schema generation for that one catalogue. The
failure is per-boot and non-deterministic; the `ES_ARRANGER_SET_INDEX` env var is
ignored by the current Arranger image, so catalogues cannot be given separate sets
indices to avoid it.

**Workaround:** restart Arranger. The index already exists on the second boot, so
the race usually doesn't recur.

```bash
make restart-arranger
```

Verify the affected catalogue recovers (expect `{"data":{"__typename":"Root"}}`):

```bash
curl -s -X POST http://localhost:5050/correlation/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ __typename }"}'
```

## Service Port Reference

| Service           | Default Port     | Notes                                    |
| ----------------- | ---------------- | ---------------------------------------- |
| Stage (portal UI) | `3000` or `3001` | `3001` if `3000` is occupied             |
| Arranger          | `5050`           | GraphQL API + introspection endpoints    |
| Arranger MCP      | `3100`           | Streamable HTTP transport at `/mcp`      |
| OpenSearch        | `9200`           | Bound to localhost                       |
| PostgreSQL        | `5435`           | Bound to localhost                       |

All ports are bound to `127.0.0.1` only.

<details>
<summary><strong>Full prelude stack environment variable reference</strong></summary>

The variables below are configurable in `docker-compose.yml` (defaults) and overridable via a `.env` file at the repository root. See `.env.example` for the complete, current list — treat it and `docker-compose.yml` as the source of truth.

**Setup service**

| Variable                                              | What it controls                                                                             |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `POSTGRES_DB` / `POSTGRES_USER` / `POSTGRES_PASSWORD` | Database credentials, must be consistent across all services                                 |
| `ES_INDEX_CONFIG_DIR`                                 | Directory of mapping files. Indices are auto-discovered here (`<name>-mapping.json` → index `<name>-index`, alias `<name>_centric`) — there are no per-index name/alias env vars |

**Arranger service**

| Variable                | What it controls                                                        |
| ----------------------- | ----------------------------------------------------------------------- |
| `ES_HOST`               | OpenSearch connection URL (the `ES_*` names are kept — Arranger reads these exact keys) |
| `ES_USER` / `ES_PASS`   | Credentials used to connect to OpenSearch                               |

**Arranger MCP service**

| Variable                  | What it controls                                                        |
| ------------------------- | ----------------------------------------------------------------------- |
| `MCP_PORT`                | Host-side port for the MCP server (container always listens on `3100`)  |
| `ARRANGER_MCP_CATALOGUES` | Comma-separated catalogues the MCP server exposes                       |
| `MCP_LOG_LEVEL`           | Pino log level for the MCP server                                       |

**Stage service**

| Variable                                 | What it controls                                                          |
| ---------------------------------------- | ------------------------------------------------------------------------- |
| `NEXT_PUBLIC_LAB_NAME`                   | The display name shown in the portal header                               |
| `NEXT_PUBLIC_ADMIN_EMAIL`                | Contact email shown in the portal footer                                  |
| `NEXT_PUBLIC_ARRANGER_DATATABLE_1_API`   | The URL Stage uses to reach an Arranger catalogue                         |
| `NEXT_PUBLIC_ARRANGER_DATATABLE_1_INDEX` | The OpenSearch alias Stage queries, must match the mapping's alias        |
| `NEXTAUTH_SECRET`                        | Authentication secret, set a strong value in production                   |

For production deployments, set credentials via a `.env` file at the repository root. See `.env.example` for the full list of overridable variables.

</details>
