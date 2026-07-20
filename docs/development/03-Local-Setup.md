# Local Setup

This section walks through standing up the full stack locally for development and testing.

### Clone and start the platform

```bash
git clone https://github.com/overture-stack/prelude.git
cd prelude
make demo
```

This starts all services (Elasticsearch, PostgreSQL, Arranger, Stage) and loads the Drug Discovery Portal sample data. The portal opens automatically when all services are healthy.

Verify Arranger is running:

```bash
curl http://localhost:5050/introspection
```

You should see a JSON response listing the `mutations`, `expression`, `correlations`, and `proteins` catalogs.

### Start the MCP server

<!-- PLACEHOLDER: Once the MCP server Docker image is published and the transport is implemented, replace the steps below with the actual run command. Until then, the server is run from source. -->

From source (development only):

```bash
cd apps/arranger
npm install
# then from the mcp-server app directory:
cd apps/mcp-server
ARRANGER_BASE_URL=http://localhost:5050 node --loader ts-node/esm src/index.ts
```

<!-- PLACEHOLDER: Confirm the correct dev start command once npm scripts are added to the mcp-server package.json. The current package.json has no scripts defined. -->

### Verify the MCP server

<!-- PLACEHOLDER: Add verification steps once the MCP server exposes a health or ready endpoint, or once the stdio/SSE transport is implemented and testable with a client. -->

### Connect your MCP host

Follow the [Researcher Guide](../user/02-MCP-Researcher-Guide.md) to connect LM Studio or another MCP host to the running server.

### Stopping the stack

```bash
make down
```

To reset all data:

```bash
make reset
```

## Adding a data table

A "data table" (e.g. correlation, mutation) spans several layers. Most are driven by
file/folder **naming convention** from a single table name (`<name>`), but the Stage
portal uses a **fixed set of 5 numbered slots** (`DATATABLE_1`..`DATATABLE_5`) that are
hardcoded in its source — so adding a *new* table beyond the existing ones requires app
changes, not just config. Work through this checklist in order.

Convention-driven layers (just add the file/folder — nothing else to wire):

| # | Location                                          | What to add                                                              |
| - | ------------------------------------------------- | ------------------------------------------------------------------------ |
| 1 | `configs/elasticsearch/<name>-mapping.json` | ES mapping. Creates index `<name>-index`, alias `<name>_centric`.        |
| 2 | `configs/arranger/<name>/`                  | Arranger catalogue (`base.json`, `extended.json`, `facets.json`, `table.json`, `matchbox.json`). Served at `http://arranger:5050/<name>`. |
| 3 | `data/<name>.csv` + `DATA_TABLES` in `docker-compose.yml` (conductor-cli) | Sample data + the table name in the upload loop.            |

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
docker restart arranger
```

Verify the affected catalogue recovers (expect `{"data":{"__typename":"Root"}}`):

```bash
curl -s -X POST http://localhost:5050/correlation/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ __typename }"}'
```

## Service Port Reference

| Service           | Default Port                     | Notes                                 |
| ----------------- | -------------------------------- | ------------------------------------- |
| Arranger          | `5050`                           | GraphQL API + introspection endpoints |
| Elasticsearch     | `9200`                           | Internal only - bound to localhost    |
| Stage (portal UI) | `3000` or `3001`                 | `3001` if `3000` is occupied          |
| PostgreSQL        | `5435`                           | Internal only                         |
| MCP Server        | `<!-- PLACEHOLDER: port TBD -->` | Confirm when transport is implemented |

<details>
<summary><strong>Full prelude stack environment variable reference</strong></summary>

The following variables are configurable in `docker-compose.yml` when running the complete prelude stack. Not required if you are deploying the MCP server against an existing Arranger instance.

**Setup service**

| Variable                                              | What it controls                                                                             |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `POSTGRES_DB` / `POSTGRES_USER` / `POSTGRES_PASSWORD` | Database credentials, must be consistent across all services                                 |
| `ES_INDEX_0_NAME`                                     | The Elasticsearch index name                                                                 |
| `ES_INDEX_0_ALIAS_NAME`                               | The alias Arranger queries, must match `aliases` in the mapping and `esIndex` in `base.json` |

**Arranger service**

| Variable                | What it controls                                                        |
| ----------------------- | ----------------------------------------------------------------------- |
| `ES_USER` / `ES_PASS`   | Credentials used to connect to Elasticsearch                            |
| `ES_ARRANGER_SET_INDEX` | Internal Arranger bookmarks index, must be unique per Arranger instance |

**Stage service**

| Variable                                 | What it controls                                                          |
| ---------------------------------------- | ------------------------------------------------------------------------- |
| `NEXT_PUBLIC_LAB_NAME`                   | The display name shown in the portal header                               |
| `NEXT_PUBLIC_ADMIN_EMAIL`                | Contact email shown in the portal footer                                  |
| `NEXT_PUBLIC_ARRANGER_DATATABLE_1_API`   | The URL Stage uses to reach Arranger                                      |
| `NEXT_PUBLIC_ARRANGER_DATATABLE_1_INDEX` | The Elasticsearch alias Stage queries, must match `ES_INDEX_0_ALIAS_NAME` |
| `NEXTAUTH_SECRET`                        | Authentication secret, set a strong value in production                   |

For production deployments, set credentials via a `.env` file at the repository root. See `.env.example` for the full list of overridable variables.

</details>
