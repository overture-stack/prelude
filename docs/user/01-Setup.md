# MCP Host Setup

This guide walks you through connecting to the Arranger MCP Server and running a complete conversational query workflow against the Drug Discovery Portal. No knowledge of GraphQL, SQON, or Elasticsearch is required.

## Host Application Setup

The MCP server communicates with any MCP-compatible host. This guide uses **LM Studio** as the worked example. You can [download and install LM Studio from here.](https://lmstudio.ai/)

![LM Studio](./img/lmstudio.png)

> **Alternative hosts:** Any MCP-compatible application (OpenCode, OpenWebUI, Claude Desktop, Ollamma etc.) will work. Configuration steps will differ; consult that application's MCP documentation.

## Model Selection

Within LM Studio:

1. Open the **Discover** tab (magnifying glass icon)
2. Search for a recommended model:

   | Model                                               | Notes                                        |
   | --------------------------------------------------- | -------------------------------------------- |
   | <!-- PLACEHOLDER: recommended model name + size --> | Best balance of speed and reasoning          |
   | <!-- PLACEHOLDER: alternative model -->             | Smaller option for machines with limited RAM |

3. Click **Download** and wait for the download to complete
4. Open the **Chat** tab and load the downloaded model. You should be able to see it in the top status bar

## MCP Server connection

1. In LM Studio, select the chat tab from the left hand menu.
2. The from the right panel under integratoins select the `+ Install` button. This will open your mcp.json file.
3. Copy and paste the following mcp.json config:

```json
{
  "mcpServers": {
    "arranger": {
      "url": "http://localhost:3100/mcp"
    }
  }
}
```

4. Click **Save** and confirm the server status shows **Connected**

## Troubleshooting

| Symptom | Likely Cause | Fix |
| ------- | ------------ | --- |
|         |              |     |
