# Platform Architecture

This portal is built on the [Overture](https://overture.bio) open-source data platform, extended with an MCP server that exposes the search API to language model tooling.

![Architecture Diagram](img/workshop-architecture-diagram.webp)

## Components

| Component                                                                                                  | Type            | Role                                                                                                                                                                                                                                             |
| ---------------------------------------------------------------------------------------------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **[Arranger](https://docs.overture.bio/docs/core-software/arranger/overview)**                             | Search API      | Sits between Elasticsearch and clients. Provides a GraphQL API and exposes introspection endpoints that describe the indexed data schema, field types, and value distributions. The MCP server is built on top of these introspection endpoints. |
| **[Stage](https://docs.overture.bio/docs/core-software/stage/overview/)**                                  | Portal frontend | React-based portal that renders Arranger's search components and hosts the documentation pages.                                                                                                                                                  |
| **[Elasticsearch](https://www.elastic.co/guide/en/elasticsearch/reference/7.17/elasticsearch-intro.html)** | Search engine   | Indexes the dataset for full-text search, faceted filtering, aggregations, and sorting.                                                                                                                                                          |
| **PostgreSQL**                                                                                             | Database        | Persistent relational storage. Serves as the source of truth; data is loaded here first, then indexed into Elasticsearch.                                                                                                                        |
| **Conductor**                                                                                              | CLI tool        | Reads CSV files, loads records into PostgreSQL, then indexes them into Elasticsearch as structured JSON documents.                                                                                                                               |
| **MCP Server**                                                                                             | AI interface    | Wraps Arranger's introspection endpoints as MCP resources and tools, allowing language models to discover the dataset schema and construct SQON queries.                                                                                         |

## How Data Flows

1. **Initialization** - Docker Compose starts all services. The `setup` container creates PostgreSQL tables and Elasticsearch indices from the configuration files in `setup/configs/`.
2. **Data loading** - Conductor reads the Drug Discovery Portal CSV, inserts each record into PostgreSQL, then bulk-indexes them into Elasticsearch.
3. **Search** - Arranger connects to Elasticsearch and exposes a GraphQL API. Stage renders facets, tables, and filters by consuming this API.
4. **Conversational access** - The MCP server calls Arranger's introspection endpoints to discover field names, types, and value distributions. An LLM host (such as LM Studio) connects to the MCP server and uses these as tools to answer researcher queries in plain language.

## Docker Compose Services

```
docker-compose.yml
├── setup              - Runs initialization scripts (index creation, health checks)
├── conductor-cli      - Loads CSV data into PostgreSQL and Elasticsearch
├── postgres           - Persistent storage (port 5435)
├── elasticsearch      - Search engine (port 9200)
├── arranger           - Search API and introspection (port 5050)
├── stage              - Portal frontend (port 3000)
└── arranger-mcp-server - MCP server (<!-- PLACEHOLDER: port TBD once transport is implemented -->)
```

Services start in dependency order: PostgreSQL and Elasticsearch must be healthy before setup scripts run; setup must complete before Arranger and Stage start.

## MCP Introspection Layer

Arranger exposes three introspection endpoints that the MCP server wraps:

| Endpoint                        | Returns                                                   | MCP surface                                             |
| ------------------------------- | --------------------------------------------------------- | ------------------------------------------------------- |
| `GET /introspection`            | Catalog count, catalog names, server mode                 | Resource: `arranger://introspection/server`             |
| `GET /introspection/sqon`       | SQON operator schema, aliases, version                    | Resource: `arranger://introspection/sqon`               |
| `GET /introspection/:catalogId` | Field names, types, and value distributions for a catalog | Resource: `arranger://introspection/catalog/:catalogId` |

These are the foundation of the conversational data discovery capability. A language model can call `list_catalogs` to learn what datasets are available, `get_catalog_fields` to learn what fields exist and what values they contain, and then construct SQON filter queries against the Arranger GraphQL API.
