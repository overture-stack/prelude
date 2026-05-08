# Overview

This page covers the monorepo package structure, the relationship between Arranger's introspection endpoints and MCP resources, and how to extend the server with additional tools, resources, or prompts.

## Monorepo Package Structure

The prelude repository is a monorepo. The MCP server lives inside the Arranger sub-repository:

```
prelude/
├── apps/
│   ├── arranger/              # Arranger monorepo (git subtree / submodule)
│   │   ├── apps/
│   │   │   ├── mcp-server/    # Arranger MCP Server (this package)
│   │   │   └── search-server/ # Arranger search API (introspection endpoints source)
│   │   ├── modules/
│   │   │   ├── components/    # React search UI components
│   │   │   ├── server/        # Core Arranger GraphQL server
│   │   │   ├── sqon/          # SQON query library
│   │   │   └── ...
│   │   └── docker/
│   ├── stage/                 # Portal frontend (Next.js)
│   └── conductor/             # ETL CLI (CSV → PostgreSQL → Elasticsearch)
├── configs/                   # Arranger + Elasticsearch configuration files
├── data/                      # Sample datasets (Drug Discovery Portal)
├── docs/                      # Documentation
└── docker-compose.yml
```

### The `mcp-server` package

```
apps/arranger/apps/mcp-server/
├── src/
│   ├── arranger/
│   │   ├── client.ts     # HTTP client for Arranger introspection endpoints
│   │   └── types.ts      # Re-exports introspection response types from search-server
│   ├── mcp/
│   │   ├── resources.ts  # MCP resource definitions backed by introspection
│   │   ├── tools.ts      # MCP tool definitions backed by introspection
│   │   └── types.ts      # Internal MCP-ish type aliases
│   ├── config.ts         # Environment variable parsing (ARRANGER_BASE_URL, ARRANGER_REQUEST_TIMEOUT_MS)
│   └── index.ts          # Composition entrypoint
├── package.json
└── tsconfig.json
```

The `search-server` package defines the canonical introspection response types (`IntrospectionResponse`, `SqonIntrospectionResponse`, `CatalogIntrospectionResponse`). The `mcp-server` imports these types directly rather than duplicating them.

## Introspection Endpoints

Arranger exposes three HTTP endpoints that describe its data. The MCP server reads these at startup and maps them to MCP resources that clients can fetch.

### Endpoint-to-resource mapping

| Arranger endpoint               | MCP resource URI                              | Resource name                   | Content                                            |
| ------------------------------- | --------------------------------------------- | ------------------------------- | -------------------------------------------------- |
| `GET /introspection`            | `arranger://introspection/server`             | `arranger_server_introspection` | Catalog inventory, mode, SQON schema path          |
| `GET /introspection/sqon`       | `arranger://introspection/sqon`               | `arranger_sqon_schema`          | SQON operator definitions and JSON schema          |
| `GET /introspection/:catalogId` | `arranger://introspection/catalog/:catalogId` | `arranger_catalog_<catalogId>`  | Field names, types, display names, valid operators |

Static resources (server + SQON) are defined in `mcp/resources.ts → buildStaticResources()`.

Catalog resources are generated dynamically: `buildCatalogResources()` receives the server introspection payload and creates one resource per catalog key.

### Endpoint-to-tool mapping

The three MCP tools give clients callable operations over the same data:

| MCP tool             | Underlying endpoint             | Description                                              |
| -------------------- | ------------------------------- | -------------------------------------------------------- |
| `list_catalogs`      | `GET /introspection`            | Returns the list of catalog IDs and their document types |
| `get_sqon_schema`    | `GET /introspection/sqon`       | Returns the SQON operator metadata                       |
| `get_catalog_fields` | `GET /introspection/:catalogId` | Returns field introspection for one catalog              |

Tools are defined in `mcp/tools.ts → buildFoundationTools()`.

**Resources vs tools:** Resources are read-only documents the client fetches by URI; tools are callable operations with optional input parameters. A client that wants to browse all available data will read resources; a client that wants to query a specific catalog by ID will call a tool.

## Configuration

Environment variables are parsed in `src/config.ts` via `createArrangerMcpConfig()`:

| Variable                      | Default                 | Type     | Description                                                                |
| ----------------------------- | ----------------------- | -------- | -------------------------------------------------------------------------- |
| `ARRANGER_BASE_URL`           | `http://localhost:5050` | `string` | Base URL of the Arranger server - trailing slash is stripped automatically |
| `ARRANGER_REQUEST_TIMEOUT_MS` | `10000`                 | `number` | HTTP timeout in milliseconds for all introspection requests                |

## Extending the Server

### Adding a new tool

1. Open `src/mcp/tools.ts`
2. Add a new `McpToolDefinition` entry to the array returned by `buildFoundationTools()`:

   ```typescript
   {
     name: 'execute_sqon_query',
     description: 'Execute a SQON filter against a catalog and return matching records.',
     inputSchema: {
       type: 'object',
       required: ['catalogId', 'sqon'],
       properties: {
         catalogId: {
           type: 'string',
           description: 'Catalog identifier from list_catalogs.',
         },
         sqon: {
           type: 'object',
           description: 'A valid SQON filter object.',
         },
       },
     },
   },
   ```

3. Implement the handler in the MCP server entrypoint (`src/index.ts`) once the MCP SDK is bootstrapped. The handler should call the Arranger GraphQL endpoint at `<arrangerBaseUrl>/<catalogId>/graphql` with the SQON embedded in the query variables.

<!-- PLACEHOLDER: Add a concrete handler example once the MCP SDK bootstrap and transport are implemented. -->

### Adding a new resource

1. Open `src/mcp/resources.ts`
2. Add a new `McpResourceDefinition` to `buildStaticResources()` or create a new builder function for dynamic resources:

   ```typescript
   {
     name: 'arranger_graphql_schema',
     uri: 'arranger://schema/graphql',
     description: 'The full GraphQL schema for this Arranger instance.',
   },
   ```

3. Implement the fetch handler in the server entrypoint to call the appropriate Arranger endpoint when the resource URI is requested.

### Adding a prompt

MCP prompts are reusable message templates that host applications can surface to users. To add one:

1. Create `src/mcp/prompts.ts`
2. Define a prompt following the MCP SDK's `Prompt` type:

   ```typescript
   export const buildFoundationPrompts = () => [
     {
       name: "explore_catalog",
       description: "Start a guided exploration of a catalog.",
       arguments: [
         {
           name: "catalogId",
           description: "Which catalog to explore",
           required: true,
         },
       ],
     },
   ];
   ```

3. Register the prompt in the MCP server entrypoint.

<!-- PLACEHOLDER: Confirm prompt type shape against the installed @modelcontextprotocol/sdk version once the dependency is added to package.json. -->

## Running the MCP Server Locally

:::caution
No npm scripts are defined in `mcp-server/package.json` yet. The run command below will be updated once scripts are added. Until then, use the raw node invocation.
:::

```bash
# From the arranger monorepo root
npm install

# Run the MCP server (development)
cd apps/mcp-server
ARRANGER_BASE_URL=http://localhost:5050 node --loader ts-node/esm src/index.ts
```

<!-- PLACEHOLDER: Replace the node command above with the npm script once defined in mcp-server/package.json. -->

The full local stack (Elasticsearch, Arranger, Stage) can be started with:

```bash
# From the prelude repository root
make demo
```

See the [Administrator Guide - Local Setup](../admin/00-MCP-Administrator-Guide.md) for details.

## Key Files Quick Reference

| File                                                                                 | Purpose                                                              |
| ------------------------------------------------------------------------------------ | -------------------------------------------------------------------- |
| [src/config.ts](../../apps/arranger/apps/mcp-server/src/config.ts)                   | Env var parsing; add new config keys here                            |
| [src/arranger/client.ts](../../apps/arranger/apps/mcp-server/src/arranger/client.ts) | HTTP client for introspection endpoints; add new endpoint calls here |
| [src/arranger/types.ts](../../apps/arranger/apps/mcp-server/src/arranger/types.ts)   | Re-exported response types from `search-server`                      |
| [src/mcp/tools.ts](../../apps/arranger/apps/mcp-server/src/mcp/tools.ts)             | MCP tool definitions; add new tools here                             |
| [src/mcp/resources.ts](../../apps/arranger/apps/mcp-server/src/mcp/resources.ts)     | MCP resource definitions; add new resources here                     |
| [src/index.ts](../../apps/arranger/apps/mcp-server/src/index.ts)                     | Composition entrypoint; wire new tools/resources here                |
