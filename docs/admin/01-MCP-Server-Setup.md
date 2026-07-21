# MCP Server Setup

This guide covers deploying the Arranger MCP Server against an Arranger instance, configuring its environment variables, verifying it, and troubleshooting startup errors.

> **In this demo, you don't run the MCP server by hand.** `make demo` starts it automatically as the `arranger-mcp` container, connected at `http://localhost:3100/mcp`. This guide is for deploying the server against a *different* or standalone Arranger instance. To connect a host application to the already-running demo server, see the [MCP Host Setup](../user/01-Setup.md) guide instead.

## What the server exposes

The MCP server learns the connected Arranger's schema from its introspection endpoints and exposes it over the **Streamable HTTP** MCP transport at `MCP_PATH` (default `/mcp`). It registers three resources and four tools:

| Tool                    | Purpose                                                                                   |
| ----------------------- | ----------------------------------------------------------------------------------------- |
| `list-catalogues`       | List the catalogues the connected Arranger exposes.                                       |
| `get-sqon-schema`       | Return the SQON filter grammar (operators, worked examples) plus the machine-readable JSON Schema. |
| `get-catalogue-fields`  | Return field introspection for one catalogue — each field's type, display name, unit, and valid operators. |
| `execute-query`         | Run a constructed SQON query against a catalogue and return matching records.             |

## Docker Deployment

### Pull the image

```bash
docker pull ghcr.io/overture-stack/arranger-mcp-server:b4a414ce
```

### Run the container

```bash
docker run -d \
  --name arranger-mcp \
  -e ARRANGER_BASE_URL=http://<your-arranger-host>:5050 \
  -e ARRANGER_CATALOGUES=correlation,mutation,expression,protein,donor \
  -p 3100:3100 \
  ghcr.io/overture-stack/arranger-mcp-server:b4a414ce
```

Replace `<your-arranger-host>` with the hostname or IP of your Arranger instance. If Arranger is running in Docker on the same host, use `host.docker.internal` (macOS/Windows) or the Arranger container's service name on a shared Docker network. Set `ARRANGER_CATALOGUES` to the catalogues your Arranger actually serves — the server exits on startup if this is missing.

The container always listens on `3100` internally; map it to any host port you like with `-p <host-port>:3100`.

## Environment Variable Reference

| Variable                      | Default                 | Required     | Description                                                             |
| ----------------------------- | ----------------------- | ------------ | ----------------------------------------------------------------------- |
| `ARRANGER_BASE_URL`           | `http://localhost:5050` | **Required** | Base URL of the Arranger server                                         |
| `ARRANGER_CATALOGUES`         | `server`                | **Required** | Comma-separated list of Arranger catalogues to expose                   |
| `ARRANGER_REQUEST_TIMEOUT_MS` | `10000`                 | Optional     | HTTP timeout in milliseconds for requests to Arranger                   |
| `MCP_HOST`                    | `0.0.0.0`               | Optional     | Host the MCP server binds to                                            |
| `MCP_PORT`                    | `3100`                  | Optional     | Port the MCP server listens on                                          |
| `MCP_PATH`                    | `/mcp`                  | Optional     | Endpoint path for the Streamable HTTP transport                         |
| `LOG_LEVEL`                   | `info`                  | Optional     | Pino log level (`trace`, `debug`, `info`, `warn`, `error`, `fatal`)     |

> The server shuts down immediately at startup if a **required** variable is missing or invalid.

## Verifying the Introspection Endpoints

The MCP server depends on Arranger's introspection endpoints. Verify each responds before starting the MCP server:

### Server introspection

```bash
curl http://<arranger-host>:5050/introspection
```

Expected: a JSON object with `catalogCount`, `catalogs`, `mode`, and `sqonSchemaPath`.

### SQON schema

```bash
curl http://<arranger-host>:5050/introspection/sqon
```

Expected: a JSON object with `$schema`, `operators`, `aliases`, `title`, and `version`.

### Catalogue field introspection

```bash
curl http://<arranger-host>:5050/introspection/<catalogueId>
```

Replace `<catalogueId>` with a catalogue name from the server introspection response (e.g. `mutation`).

Expected: a JSON object with `catalogId`, `documentType`, `generatedAt`, and a `fields` map.

If any endpoint returns a non-200 response, confirm Arranger is healthy and the index is configured correctly before starting the MCP server.

### Verifying the MCP server itself

The MCP server has no plain health route — `/mcp` requires an MCP session handshake. A TCP connect to the listening port is enough to confirm the process is up:

```bash
docker logs arranger-mcp        # should show it connected to Arranger and started listening
nc -z localhost 3100 && echo "port open"
```

## Log File Sensitivity

> **Important - read before enabling verbose logging in production.**

When `LOG_LEVEL` is set to `debug` or `trace`, the MCP server may write SQON query objects to its logs. SQON queries are generated from researcher natural-language input and can contain field names and value filters that reflect the researcher's investigation. In sensitive research contexts, these log entries may reveal:

- the specific datasets or cohorts a researcher is querying
- the filter criteria and value ranges used in a session
- patterns of research interest across users

**Treat log files as potentially sensitive data.** Apply the same access controls, retention policies, and audit requirements you would apply to query logs from your primary research portal. Do not store log files in publicly accessible locations, and include them in your data governance and privacy impact assessments before enabling verbose logging in production. Keep `LOG_LEVEL` at `info` or higher in production unless you are actively debugging.

## Canonical documentation

This page covers deploying the server. For the server's internals, development workflow, and testing (MCP Inspector, LM Studio), see the canonical Arranger MCP Server documentation in the Arranger repository: [`apps/mcp-server`](https://github.com/overture-stack/arranger/tree/main/apps/mcp-server). A pinned copy is vendored in this repo at `apps/arranger/apps/mcp-server/`.
