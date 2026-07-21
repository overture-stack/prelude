# Project Overview

This portal provides a testing environment for the development of Overture's **conversational data discovery** functionality.

## What This Portal Is

The portal combines the [Overture](https://overture.bio) data platform with a [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) server, enabling researchers to connect a self-hosted language model directly to a structured research dataset and ask questions in plain language.

![](./img/crosstablefilter.png)

The data loaded into this instance is a **representative sample** drawn from the **Drug Discovery Portal** - roughly 1,000 rows in each of four gene-statistics catalogues, not the full upstream dataset (which runs to hundreds of millions of records). The four catalogues are gene correlation data (`correlation`), gene mutation data (`mutation`), gene expression profiles (`expression`), and protein interaction statistics (`protein`). Researchers use these to iteratively refine gene lists through cross-table filtering, narrowing thousands of candidate genes into focused sets that feed into deeper analyses such as pathway analysis.

The samples are sized for demonstration, so their coverage is deliberately narrow and uneven: `expression` spans 32 cancer types, while `mutation` is BRCA-only and `correlation` is DLBC-only.

## What We Want to Demonstrate

A researcher opens their LLM host (such as LM Studio), connects it to this portal's MCP server, and asks questions like:

> "Show me genes with >10% mutation frequency with hotspot designation in COADREAD"
> "Which of these genes show elevated expression levels"
> "What pathways are these genes involved in?"

A self-hosted language model uses the MCP server to introspect the dataset's schema, construct structured SQON queries against the Arranger search API, and return filtered results without the researcher needing to know the underlying field names or query syntax.
