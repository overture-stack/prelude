# Next Steps

### What You Built

You now have a locally running data discovery portal with:

- **PostgreSQL:** a database to store persistent data
- **Elasticsearch:** indexing your tabular data with typed field mappings
- **Arranger:** providing a GraphQL search API and configurable UI components
- **Stage:** rendering a browser-based portal with faceted search, sortable tables, and data export

You've seen how to generate configuration files from CSV data, wire services together through Docker Compose, load data with Conductor, customize the portal's search interface and appearance, and understand the deployment architecture for making portals network-accessible.

### Expanding the Platform

The search and exploration stack used in this workshop is part of the broader Overture platform. Depending on your needs, you can extend it with:

| Need                       | Overture Service | What It Does                                                       |
| -------------------------- | ---------------- | ------------------------------------------------------------------ |
| Enforce data schemas       | **Lectern**      | Define and manage data dictionaries that validate submissions      |
| Accept tabular submissions | **Lyric**        | Structured data submission with validation against Lectern schemas |
| Manage file metadata       | **Song**         | Track and validate files with analysis schemas                     |
| Store and transfer files   | **Score**        | Object storage integration (S3, Azure Blob, etc.)                  |
| Automate indexing          | **Maestro**      | Event-driven indexing from Song/Lyric into Elasticsearch           |

These services compose together, letting you build from a simple search portal to a full data management platform incrementally. For more information, see the [Overture documentation](https://docs.overture.bio).

### Conversational Data Discovery

:::info
This capability is currently in active development by the Overture team. It is not part of this workshop, but it is a direct and natural extension of the infrastructure you are building here.
:::

One of the most compelling reasons to structure your data through Arranger is that it makes your data **machine-accessible in a way that modern AI tooling can reason over**. The same GraphQL API and schema introspection endpoints that power the browser portal can be consumed by a language model, enabling researchers to query data in plain language rather than constructing filters manually.

The Overture team is building a **Conversational Data Discovery (CDD)** platform: an interactive research environment that wraps a self-hosted language model around Arranger-indexed datasets. Because Arranger exposes a live description of your data, including field names, types, value distributions, and catalogue structure, a language model can:

- **Understand what data is available** without being hardcoded to a specific schema. It reads your index configuration at runtime.
- **Translate natural language questions into validated queries.** A researcher asks "how many samples have a TP53 mutation?" and the model constructs the correct filter against your specific field names.
- **Ground its responses in your actual data** rather than hallucinating field names or value ranges, it reads the schema before generating any query.
- **Execute analysis code in a sandboxed workspace.** Once a query is confirmed, the model can generate Python to analyse and visualise results, running it in an isolated container where the researcher approves every step.

**Why Arranger specifically matters here:** Most data stores are opaque to language models. There is no way for a model to discover what fields exist, what values are valid, or how to construct a correct query without being told explicitly. Arranger's introspection endpoints solve this structurally. The field metadata, operator grammar, and value distributions it exposes are exactly the grounding information a language model needs to query your data reliably.

**Why self-hosted models:** Research data is often sensitive. Routing queries through commercial AI providers is not viable for many research contexts. The CDD platform runs capable models on sovereign infrastructure, adjacent to the data, with full control over the stack.

The platform is built around four core principles:

- **Data minimisation by default:** the model operates on schemas and metadata, not record-level data, unless the researcher explicitly consents to share results.
- **No action without consent:** every query, code execution, and file access requires explicit researcher approval before it happens.
- **Sandboxed execution:** all code runs in a network-isolated container with no access outside its defined boundaries.
- **Reproducibility:** every session, including messages, tool calls, consent decisions, generated code, and outputs, can be exported as a complete reproducible research package.

The CDD platform connects to Arranger via the [Model Context Protocol (MCP)](https://modelcontextprotocol.io/), an open standard for giving language models access to external tools and data sources. An Arranger MCP server wraps your existing deployment with no changes to your data or index configuration required.

Setting up the infrastructure in this workshop, Arranger-indexed, schema-configured, and queryable via GraphQL, is the prerequisite step. When the CDD platform reaches production, your deployment will be immediately compatible.

### Get in Touch

Whether you're adapting the platform to your own data, running into issues after the workshop, or exploring what a larger deployment might look like for your research group, we're happy to help. Reach out to the Overture team directly at [contact@overture.bio](mailto:contact@overture.bio).

### Post-Workshop Survey

If you have a few minutes, we'd appreciate your feedback on the workshop. Your responses help us improve the content, pacing, and hands-on exercises for future sessions.

**[Fill in the post-workshop survey →](#)**

### Resources

- **Overture Documentation:** [docs.overture.bio](https://docs.overture.bio)
- **Overture GitHub:** [github.com/overture-stack](https://github.com/overture-stack)
- **Arranger Docs:** [Arranger overview](https://docs.overture.bio/docs/core-software/arranger/overview/)
- **Stage Docs:** [Stage overview](https://docs.overture.bio/docs/core-software/stage/overview/)
- **Elasticsearch 7.17 Reference:** [elastic.co/guide](https://www.elastic.co/guide/en/elasticsearch/reference/7.17/index.html)
- **Support Forum:** [GitHub Discussions](https://github.com/overture-stack/roadmap/discussions/categories/support)
