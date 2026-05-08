# MCP Server Setup

This guide covers deploying the Arranger MCP Server against an existing Arranger instance, configuring environment variables, verifying the introspection endpoints, and troubleshooting startup errors.

## Docker Deployment

### Pull the image

```bash
docker pull <!-- PLACEHOLDER: registry/image:tag - publish when MCP server Docker image is released -->
```

### Run the container

```bash
docker run -d \
  --name arranger-mcp-server \
  -e ARRANGER_BASE_URL=http://<your-arranger-host>:5050 \
  -e ARRANGER_REQUEST_TIMEOUT_MS=10000 \
  <!-- PLACEHOLDER: -p <host-port>:<container-port> - confirm port when stdio/SSE transport is finalised --> \
  <!-- PLACEHOLDER: registry/image:tag -->
```

Replace `<your-arranger-host>` with the hostname or IP of your Arranger instance. If Arranger is running in Docker on the same host, use `host.docker.internal` (macOS/Windows) or the container's service name.

## Environment Variable Reference

| Variable                      | Default                 | Required | Description                                                         |
| ----------------------------- | ----------------------- | -------- | ------------------------------------------------------------------- |
| `ARRANGER_BASE_URL`           | `http://localhost:5050` | Yes      | Base URL of the Arranger server, without a trailing slash           |
| `ARRANGER_REQUEST_TIMEOUT_MS` | `10000`                 | No       | HTTP timeout in milliseconds for introspection requests to Arranger |

No authentication variables are required in the current Aim 1 release. Authentication support is planned for a future release.

## Verifying the Introspection Endpoints

The MCP server depends on three Arranger introspection endpoints. Verify each is responding before starting the MCP server:

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

### Catalog field introspection

```bash
curl http://<arranger-host>:5050/introspection/<catalogId>
```

Replace `<catalogId>` with a catalog name from the server introspection response (e.g. `mutations`).

Expected: a JSON object with `catalogId`, `documentType`, `generatedAt`, and a `fields` map.

If any endpoint returns a non-200 response, confirm Arranger is healthy and the index is configured correctly before starting the MCP server.

## Log File Sensitivity

> **Important - read before enabling logging in production.**

When logging is enabled, the MCP server may write SQON query objects to log files. SQON queries are generated from researcher natural language input and can contain terms, field names, and value filters that reflect the researcher's investigation. In sensitive research contexts, these log entries may reveal:

- the specific datasets or cohorts a researcher is querying
- the filter criteria and value ranges used in a session
- patterns of research interest across users

**Treat log files as potentially sensitive data.** Apply the same access controls, retention policies, and audit requirements you would apply to query logs from your primary research portal. Do not store log files in publicly accessible locations, and include them in your data governance and privacy impact assessments before enabling verbose logging in production.

<!-- PLACEHOLDER: Document the logging configuration variable here once it is implemented in the MCP server. Currently `config.ts` only defines `ARRANGER_BASE_URL` and `ARRANGER_REQUEST_TIMEOUT_MS` - no logging env var exists yet. -->
