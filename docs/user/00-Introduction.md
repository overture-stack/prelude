# Project Overview

<!-- PLACEHOLDER: Add a portal screenshot or short demo GIF here once the MCP interface is finalized. -->

This portal is here to provide a basic testing environment the development of Overtures **conversational data discovery** functionalities.

## What This Portal Is

The portal combines the [Overture](https://overture.bio) data platform with a [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) server, enabling researchers to connect a self-hosted language model directly to a structured research dataset and ask questions in plain language.

![](./img/crosstablefilter.png)

The dataset loaded into this instance is a subset from the **Drug Discovery Portal**, it hosts 4 data explore tables (~405 Million records total). Each table is a tabular datasets with statistics related to genes. The tables include: gene correlation data, gene mutation data, gene expression profile data, and protein interaction statistics (with corresponding genes). Researchers use these four data sets to iteratively refine gene lists through cross-table filtering, narrowing 20,000 gene candidates into focused sets that feed directly into deeper analyses, including pathway analysis, end-to-end in one place.

## What We Want to Demonstrate

A researcher opens their LLM host (such as LM Studio), connects it to this portal's MCP server, and asks questions like:

> "Show me genes with >10% mutation frequency with hotspot designation in COADREAD"
> "Which of these genes show elevated expression levels"
> "What pathways are these genes involved in?"

A self hosted language model uses the MCP server to introspect the dataset's schema, construct structured SQON queries against the Arranger search API, and return filtered results without the researcher needing to know the underlying field names or query syntax.
