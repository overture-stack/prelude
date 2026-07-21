# MCP Host Setup

This guide walks you through connecting an MCP host to the Arranger MCP Server and running a conversational query workflow against the sample catalogues. No knowledge of GraphQL, SQON, or OpenSearch is required.

You interact with the data through your **MCP host application** — there is no separate chat UI to install. This guide uses **LM Studio** as the worked example; any MCP-compatible host works the same way once pointed at the server.

## Host Application Setup

The MCP server communicates with any MCP-compatible host. This guide uses **LM Studio** as the worked example. You can [download and install LM Studio here](https://lmstudio.ai/).

![LM Studio](./img/lmstudio.png)

> **Alternative hosts:** Any MCP-compatible application (Claude Desktop, Ollama, OpenCode, OpenWebUI, etc.) will work. The connection details below are the same; only the location of the MCP configuration differs. Consult that application's MCP documentation.

## Model Selection

The MCP workflow requires a model that supports **tool calling** — the model calls the server's tools to discover the schema and run queries. In LM Studio, tool-capable models are marked with a tool-use badge.

Within LM Studio:

1. Open the **Discover** tab (magnifying glass icon)
2. Search for a tool-capable model. Reasonable starting points:

   | Model                             | Notes                                        |
   | --------------------------------- | -------------------------------------------- |
   | `Qwen2.5-7B-Instruct` (Q4, ~4.7 GB) | Good balance of speed and reasoning; strong tool-calling |
   | `Qwen2.5-3B-Instruct` (Q4, ~2 GB)   | Smaller option for machines with limited RAM |

   > These are **provisional starting points**, not a benchmarked recommendation. A defensible, benchmarked model recommendation lands after the August 2026 model evaluation — see [Development → Model Benchmarks](../development/05-Model-Benchmarks.md).

3. Click **Download** and wait for the download to complete
4. Open the **Chat** tab and load the downloaded model. You should see it in the top status bar.

## MCP Server Connection

The server speaks the **Streamable HTTP** MCP transport at `http://localhost:3100/mcp`. In LM Studio:

1. Select the **Chat** tab from the left-hand menu.
2. In the right-hand panel, under **Integrations**, select **`+ Install`**. This opens your `mcp.json` file.
3. Add the following server entry:

```json
{
  "mcpServers": {
    "arranger": {
      "url": "http://localhost:3100/mcp"
    }
  }
}
```

4. Click **Save** and confirm the server status shows **Connected**.

> If you set a custom `MCP_PORT` in your `.env`, use that port in the URL instead of `3100`.

## Troubleshooting

| Symptom | Likely cause | Fix |
| ------- | ------------ | --- |
| Server shows **Disconnected** in LM Studio | The `arranger-mcp` container isn't running | `docker ps` should list `arranger-mcp` on port 3100. If missing, the demo may still be starting, or it exited — check `docker logs arranger-mcp`. |
| Connection refused at `localhost:3100` | Wrong port, or another process is using 3100 | Confirm the host-side port with `docker ps`; if you overrode `MCP_PORT` in `.env`, use that value in the URL. |
| Connected, but the model never calls a tool | The loaded model doesn't support tool calling | Load a tool-capable model (look for the tool-use badge in LM Studio). |
| A query returns no rows | The filter falls outside the sample's coverage | The samples are narrow (e.g. `mutation` is BRCA-only). Ask the model what fields and values exist first, using `get-catalogue-fields`. |
