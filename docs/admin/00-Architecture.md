# Platform Architecture

This portal is built on the [Overture](https://overture.bio) open-source data platform, extended with an MCP server that exposes the search API to language model tooling.

![Architecture Diagram](img/workshop-architecture-diagram.webp)

## Components

| Component                                                                                                  | Type            | Role                                                                                                                                                                                                                                             |
| ---------------------------------------------------------------------------------------------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **[Arranger](https://docs.overture.bio/docs/core-software/arranger/overview)**                             | Search API      | Sits between OpenSearch and clients. Provides a GraphQL API and exposes introspection endpoints that describe the indexed data schema, field types, and value distributions. The MCP server is built on top of these introspection endpoints. |
| **[Stage](https://docs.overture.bio/docs/core-software/stage/overview/)**                                  | Portal frontend | React-based portal that renders Arranger's search components and hosts the documentation pages.                                                                                                                                                  |
| **[OpenSearch](https://opensearch.org/docs/latest/)**                                                      | Search engine   | Indexes the dataset for full-text search, faceted filtering, aggregations, and sorting. An Apache-2.0 fork of Elasticsearch 7.10.                                                                                                                |
| **PostgreSQL**                                                                                             | Database        | Persistent relational storage. Serves as the source of truth; data is loaded here first, then indexed into OpenSearch.                                                                                                                          |
| **Conductor**                                                                                              | CLI tool        | Reads CSV files, loads records into PostgreSQL, then indexes them into OpenSearch as structured JSON documents.                                                                                                                                 |
| **MCP Server**                                                                                             | AI interface    | Wraps Arranger's introspection endpoints as MCP resources and tools, allowing language models to discover the dataset schema, construct SQON queries, and execute them.                                                                          |

## How Data Flows

1. **Initialization** - Docker Compose starts all services. The `setup` container creates PostgreSQL tables and OpenSearch indices from the mapping files in `configs/opensearch/`.
2. **Data loading** - Conductor reads each catalogue's CSV, inserts records into PostgreSQL, then bulk-indexes them into OpenSearch.
3. **Search** - Arranger connects to OpenSearch and exposes a GraphQL API. Stage renders facets, tables, and filters by consuming this API.
4. **Conversational access** - The MCP server calls Arranger's introspection endpoints to discover field names, types, and value distributions. An LLM host (such as LM Studio) connects to the MCP server over Streamable HTTP and uses its tools to answer researcher queries in plain language.

## Docker Compose Services

```
docker-compose.yml
├── setup          - Runs initialization scripts (index creation, health checks), then exits
├── conductor-cli  - Loads CSV data into PostgreSQL and OpenSearch, then exits
├── postgres       - Persistent storage (port 5435)
├── opensearch     - Search engine (port 9200)
├── arranger       - Search API and introspection (port 5050)
├── arranger-mcp   - MCP server, Streamable HTTP at /mcp (port 3100)
└── stage          - Portal frontend (port 3000)
```

Services start in dependency order: PostgreSQL and OpenSearch must be healthy before setup scripts run; setup must complete before Arranger and Stage start; the MCP server waits for Arranger to be healthy.

## MCP Introspection Layer

Arranger exposes three introspection endpoints that the MCP server wraps as resources:

| Endpoint                        | Returns                                                   | MCP resource                                            |
| ------------------------------- | --------------------------------------------------------- | ------------------------------------------------------- |
| `GET /introspection`            | Catalogue count, catalogue names, server mode             | `arranger://introspection/server`                       |
| `GET /introspection/sqon`       | SQON operator schema, aliases, version                    | `arranger://introspection/sqon`                         |
| `GET /introspection/:catalogueId` | Field names, types, and valid operators for a catalogue | `arranger://introspection/catalog/:catalogueId`         |

On top of these, the MCP server registers four tools: `list-catalogues`, `get-sqon-schema`, `get-catalogue-fields`, and `execute-query`. A language model calls `list-catalogues` to learn what datasets are available, `get-catalogue-fields` to learn what fields exist and their valid operators, `get-sqon-schema` for the filter grammar, and `execute-query` to run a constructed SQON query against Arranger. See the [MCP Server Setup](../admin/01-MCP-Server-Setup.md) guide for the full tool inventory and the canonical Arranger MCP documentation.
