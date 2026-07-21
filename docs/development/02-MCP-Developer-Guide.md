# MCP Server Developer Guide

The Arranger MCP Server is developed **upstream in the [Arranger repository](https://github.com/overture-stack/arranger)**, not in this repo. Prelude vendors it as a git submodule and runs the published image. This page orients you to where it lives and how to work on it; the canonical development documentation is in the Arranger repo itself.

> **Single source of truth.** The server's tool/resource internals, extension patterns, and SDK details are documented and maintained in the Arranger repo. This page deliberately does not duplicate them — a second copy would drift out of sync. For anything beyond orientation, follow the [canonical Arranger MCP docs](https://github.com/overture-stack/arranger/tree/main/apps/mcp-server).

## Where it lives in this repo

The Arranger monorepo is vendored under `apps/arranger/` (a submodule pinned to a specific commit). The MCP server is one app inside it:

```
prelude/
├── apps/
│   ├── arranger/                    # Arranger monorepo (git submodule)
│   │   └── apps/
│   │       ├── mcp-server/          # Arranger MCP Server
│   │       └── search-server/       # Arranger search API (introspection source)
│   ├── stage/                       # Portal frontend (Next.js)
│   └── conductor/                   # ETL CLI (CSV → PostgreSQL → OpenSearch)
├── configs/                         # Arranger + OpenSearch + Lectern configuration
├── data/                            # Sample catalogues
├── docs/                            # This documentation
└── docker-compose.yml
```

The MCP server package itself:

```
apps/arranger/apps/mcp-server/src/
├── arranger/
│   ├── client.ts            # HTTP client for Arranger introspection endpoints
│   ├── queryBuilder.ts      # builds Arranger GraphQL queries from a SQON filter
│   ├── queryResults.ts      # shapes execute-query results
│   ├── queryValidation.ts   # validates a query before execution
│   ├── types.ts             # introspection + SQON response types (zod schemas)
│   └── validation.ts        # validates the connection to Arranger at startup
├── http/app.ts              # Express app, Streamable HTTP transport
├── mcp/
│   ├── tools.ts             # registers list-catalogues, get-sqon-schema, get-catalogue-fields
│   ├── executeQueryTool.ts  # registers execute-query (with a confirmation step)
│   └── resources.ts         # registers the three introspection resources
├── utils/                   # config parsing, logger, in-memory event store, errors
├── index.ts                 # entrypoint
└── server.ts                # creates the MCP server and wires deps
```

## Tools and resources, as deployed

The server registers **four tools** and **three resources**, all backed by Arranger's introspection endpoints:

| Tool                    | Underlying endpoint                | Description                                                     |
| ----------------------- | ---------------------------------- | --------------------------------------------------------------- |
| `list-catalogues`       | `GET /introspection`               | Returns the catalogues the connected Arranger exposes.          |
| `get-sqon-schema`       | `GET /introspection/sqon`          | Returns the SQON grammar + machine-readable JSON Schema.        |
| `get-catalogue-fields`  | `GET /introspection/:catalogueId`  | Returns field introspection (type, operators) for one catalogue. |
| `execute-query`         | Arranger GraphQL                   | Runs a constructed SQON query and returns matching records.     |

| Resource URI                                    | Content                                            |
| ----------------------------------------------- | -------------------------------------------------- |
| `arranger://introspection/server`               | Catalogue inventory, mode, SQON schema path        |
| `arranger://introspection/sqon`                 | SQON operator schema and metadata                  |
| `arranger://introspection/catalog/{catalogueId}` | Per-catalogue field metadata                       |

**Resources vs tools:** resources are read-only documents a client fetches by URI; tools are callable operations. A client browsing available data reads resources; a client running a query calls tools.

## Running the server

**In the demo:** the server runs automatically as the `arranger-mcp` container. Nothing to do — see [Local Setup](./03-Local-Setup.md).

**From source (to develop the server):** work inside the Arranger monorepo, which supplies the build and dev scripts. From the Arranger repo root:

```bash
npm ci
npm run modules:build
cp apps/mcp-server/.env.schema apps/mcp-server/.env   # then edit ARRANGER_BASE_URL / ARRANGER_CATALOGUES
npm run mcp-server:dev
```

To exercise the tools interactively, use the MCP Inspector (`npm run mcp-server:inspect`) or connect LM Studio. Both are documented in the [Arranger MCP docs](https://github.com/overture-stack/arranger/tree/main/apps/mcp-server).

## Extending the server

Adding tools, resources, or prompts is done in the Arranger repo (`apps/mcp-server/src/mcp/`), following its conventions and the [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk). Because Prelude vendors the server at a pinned commit, changes land upstream first and are picked up here by bumping the submodule and the published image tag in `docker-compose.yml`.

For deploying the server against your own Arranger, see [MCP Server Setup](../admin/01-MCP-Server-Setup.md).
