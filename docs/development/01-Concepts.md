# Core Concepts

The goal of Aim 1 is to enable researchers to query data using plain-english:

> _"show me all breast cancer samples with RNA-seq data from Canadian donors"_

A researcher types that sentence into a conversational interface and the system turns it into the exact query that returns the right records, no knowledge of filter names, field structures, or query syntax required.

The technical task is _natural language in, structured query out_. The closest analogy is **text-to-SQL**, where a sentence becomes a SQL database query. Here the target is different: instead of SQL, the system generates a **SQON filter**, a **GraphQL field selection**, and sometimes a **GraphQL aggregation**, the three components that together form a query against the Overture Arranger catalogue. Those terms are explained in the next section.

## The Platform

**Overture** is an open-source toolkit for building large biomedical data platforms. **Arranger** is the Overture component that answers search queries. When the docs say "query Arranger," they mean "ask the search service for matching records."

A **catalogue** is one searchable collection of records with a defined set of fields, one table or index. The project has several, including drug-discovery and ARGO mock data catalogues. A question may target one catalogue or span several.

## The Query

A generated **query** is not one thing but three:

1. **SQON filter:** _which_ records to return, expressed as nested boolean logic (`AND`, `OR`, `NOT`) over catalogue fields.
2. **GraphQL field selection:** _which fields_ to return for those records.
3. **GraphQL aggregation:** an optional summary (e.g. "how many per country"), when the question implies one.

:::info
Taking the running example apart:

- "breast cancer … RNA-seq … Canadian donors" → the **filter** (the conditions).
- "show me … samples" → the **field selection** (what to display about each sample).
- If it had said "_how many_ samples per province," that "how many … per …" would be an **aggregation**.
  :::

## The Filter Language (SQON)

**SQON** ("Serializable Query Object Notation") is Overture's JSON filter format, used by Arranger to express search conditions. It supports **boolean logic**, `AND`, `OR`, `NOT`, over fields. Our running example:

> _"show me all breast cancer samples with RNA-seq data from Canadian donors"_

translates to:

```json
{
  "op": "and",
  "content": [
    {
      "op": "in",
      "content": { "fieldName": "cancer_type", "value": ["breast"] }
    },
    { "op": "in", "content": { "fieldName": "assay", "value": ["RNA-seq"] } },
    {
      "op": "in",
      "content": { "fieldName": "donor_country", "value": ["Canada"] }
    }
  ]
}
```

## Field Selection and Aggregation (GraphQL)

**GraphQL** is the API query language Arranger uses to communicate results. The model uses it to specify _which fields to return_ for matching records (field selection) and, when the question implies a summary, _how to aggregate them_ (e.g. "count per country").

> _"**show me** all breast cancer **samples** with RNA-seq data from Canadian donors"_

The "show me … samples" part becomes a **field selection**, which fields to return for each matching record:

```graphql
query ($sqon: JSON) {
  sample {
    hits(filters: $sqon) {
      total
      edges {
        node {
          sample_id
          cancer_type
          assay
          donor_country
        }
      }
    }
  }
}
```

:::note
The SQON filter defined earlier is passed to Arranger as the `$sqon` variable. Arranger exposes each catalogue as a GraphQL type with a `hits` connection (matching records, returned as `edges` → `node`) and an `aggregations` block (summaries). Field names like `sample` are illustrative — actual names are catalogue-specific.
:::

Had the question instead asked "_how many_ samples **per province**," that summary becomes an **aggregation**, Arranger returns one bucket per value with a count:

```graphql
query ($sqon: JSON) {
  sample {
    aggregations(filters: $sqon) {
      donor_province {
        buckets {
          key
          doc_count
        }
      }
    }
  }
}
```

The same `$sqon` filter scopes both: it decides _which_ records are counted or returned, while the GraphQL body decides _what_ comes back about them.

## Arranger Introspection

Before a model can generate a valid query, it must know what fields exist, their types, and which operators are legal. The act of asking the platform to describe its own schema is **introspection**. An **introspection snapshot** is a frozen, saved copy of that schema, **pinned by a commit hash** so everyone evaluates against the _exact same_ schema version.

:::info
This matters for a practical reason: the schema description can be large, and a model can only read so much text at once (its **context window**). One early task measures how big the schema is in a few formats and whether the smallest fits in the budget.
:::

**Token economy.** Models read and write text in **tokens** (roughly 3/4 of a word each), and every token has a cost in both money and context-window space. The schema is sent to the model on _every_ request, so its size sets a fixed "tax" paid before the user's actual question is even considered: a bulky schema leaves less room for the question, the retrieved data, and the model's reasoning, and it raises the per-call price. This is why the format of the introspection snapshot matters as much as its content, a representation that drops redundant boilerplate (e.g. TOON or a compact JSON shape) can convey the same field/type/operator information in far fewer tokens, freeing budget for the work that actually varies between queries.

## The Data

Evaluation runs against two catalogues chosen to span a **complexity gradient**, so the system is tested on both the easy and the hard end of the schema shapes it will meet in production.

**Drug-discovery data (flat).** The OICR Drug Discovery catalogue is the initial target. Its records are **flat**: fields sit at the top level with no nesting, so a question maps to a relatively shallow SQON filter and a straightforward GraphQL field selection. This is the lower-complexity baseline.

**ARGO mock data (nested).** The ICGC-ARGO mock catalogue is the higher-complexity case. Its records are **nested**, donors contain specimens, specimens contain samples, and so on, which means a single question can require filters and field selections that reach several levels deep. Using mock (synthetic) ARGO data keeps the schema realistically complex.

## Fixtures and Execution Accuracy

Each test case is called a **fixture**: a natural-language prompt paired with a **reference query**, the correct hand-authored answer for all three components (filter, field selection, aggregation). Fixtures are drawn from both catalogues above to cover the full complexity gradient. The full set of fixtures is the **corpus**.

:::info
**Execution Accuracy (EA)** is the primary scoring metric: the percentage of fixtures where the model's generated query matches the reference query across all three components.
:::

## The LLM

A **large language model (LLM)** is an AI system trained on large amounts of text that, given a prompt, produces a response (a process called **inference**). Here, the model's job is to take a researcher's question and produce a valid query.

**Open-weights** models can be downloaded and run on local hardware (e.g. Mistral, Qwen, Gemma, Llama). The project evaluates these exclusively. A **frontier** (commercial) model like Claude is used only once, offline, to validate the test set.

:::note
**Data sovereignty** is why: sensitive cancer data and researchers' questions must not be sent to an external server. This constraint drives many of the design choices across the planning docs.
:::

**Model size** is measured in **parameters** (e.g. **7B** = 7 billion). Two architectures appear in the candidate list:

- **Dense:** all parameters are used for every token.
- **MoE (Mixture of Experts):** only a subset of parameters is active per token, so a large model can run faster than its total size suggests (e.g. "109B / 17B active").

**Quantization** reduces memory requirements by storing model weights at lower precision, with a small accuracy tradeoff. `Q4_K_M` and `FP8` are the formats used here.

**Tokens and context window:** models read and write in **tokens** (roughly 3/4 of a word each). The **context window** is the maximum amount of text a model can consider at once, prompt plus response. This is why the introspection sizing spike matters: if the schema is too large to fit alongside the question, the model works with an incomplete picture.

**Temperature** controls output randomness. At **temperature 0** the model always picks its most likely next token, making output deterministic and reproducible. All evaluations run at temperature 0. (`top_p`, `top_k` are related sampling parameters, also set to disable randomness.)

**Tool calling:** instead of only producing text, a model can invoke a named function with structured arguments. This is how the model interacts with Arranger in the assembled pipeline.

## Inference Runtimes

An **inference runtime** is the program that loads and runs a model, handling token generation. It is distinct from the **MCP Host**, which is the conversational interface the researcher interacts with. The runtime sits below the host in the stack, the host sends prompts to it and receives generated text back.

The project currently uses three runtimes:

- **Ollama:** local runner used to evaluate candidates.
- **vLLM / TGI:** high-throughput server runtimes.
- **LM Studio:** a desktop app that bundles a runtime with a chat UI. Note that LM Studio's built-in chat interface is not the same as the Chainlit MCP Host, even though both present a conversational interface to the user.

## MCP (Model Context Protocol)

**MCP** is an open standard for connecting AI models to tools and data sources, often described as "USB-C for AI": one standard plug so any compatible model can use any compatible tool. Three roles:

- **MCP server:** exposes capabilities to the model. The project builds one wrapping the Arranger search API.
- **MCP host:** the application the researcher interacts with. In Aim 1 this is the Chainlit conversational interface.
- **MCP client:** the connector that routes requests from the host to MCP servers. In Aim 1 the host connects directly; a purpose-built client is introduced in Aim 2.

## Primitives: Tools, Resources, and Prompts

MCP exposes three types of capabilities:

- **Tools:** actions the model can invoke (e.g. `execute_query`).
- **Resources:** read-only data the model can fetch (e.g. the SQON grammar, available catalogues, catalogue fields).
- **Prompts:** pre-defined workflows. For example, `query_arranger` walks the model through selecting a catalogue, building a query, presenting it to the researcher for approval, then executing it.

The approval step is a core requirement: the researcher must confirm the query before any data is fetched.

## Transports

A **transport** is the communication protocol between host and server. The project uses two:

- **stdio:** standard input/output, for terminal and command-line clients.
- **Streamable HTTP:** an HTTP-based transport that supports streaming responses, for GUI clients like Chainlit.

Supporting both is called **dual transport**.

## Glossary

A quick-reference for the terms introduced above, in the order a reader is most likely to look them up. Each entry points to the section with the full explanation.

| Term                         | One-line definition                                                                                                                                                                           | See                             |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| **Aggregation**              | Optional GraphQL summary that returns one bucket-and-count per value (e.g. "how many per country").                                                                                           | Field Selection and Aggregation |
| **Arranger**                 | The Overture component that answers search queries against a catalogue.                                                                                                                       | The Platform                    |
| **Catalogue**                | One searchable collection of records with a defined set of fields (one table/index).                                                                                                          | The Platform                    |
| **Complexity gradient**      | The flat→nested span of schema shapes the eval deliberately tests across.                                                                                                                     | The Data                        |
| **Context window**           | The maximum amount of text a model can consider at once (prompt + response).                                                                                                                  | The LLM                         |
| **Corpus**                   | The full set of fixtures used for evaluation.                                                                                                                                                 | Fixtures and Execution Accuracy |
| **Data sovereignty**         | The constraint that sensitive data and questions must not leave local infrastructure; drives the open-weights-only choice.                                                                    | The LLM                         |
| **Dense**                    | Model architecture where all parameters are used for every token.                                                                                                                             | The LLM                         |
| **Dual transport**           | Supporting both stdio and Streamable HTTP transports.                                                                                                                                         | Transports                      |
| **Execution Accuracy (EA)**  | Primary scoring metric: share of fixtures where the generated query is correct against its reference. (Downstream docs call this _Execution Equivalence_ and score it as a record-set match.) | Fixtures and Execution Accuracy |
| **Field selection**          | The GraphQL clause specifying which fields to return for matching records.                                                                                                                    | Field Selection and Aggregation |
| **Fixture**                  | One test case: a natural-language prompt paired with a hand-authored reference query.                                                                                                         | Fixtures and Execution Accuracy |
| **Frontier model**           | A commercial API model (e.g. Claude), run once offline to validate fixtures; not a deployment target.                                                                                         | The LLM                         |
| **GraphQL**                  | The API query language Arranger uses to express field selections and aggregations.                                                                                                            | Field Selection and Aggregation |
| **Inference**                | The process of a model producing a response from a prompt.                                                                                                                                    | The LLM                         |
| **Inference runtime**        | The program that loads and runs a model (e.g. Ollama, vLLM, LM Studio); sits below the MCP host.                                                                                              | Inference Runtimes              |
| **Introspection**            | Asking the platform to describe its own schema (fields, types, legal operators).                                                                                                              | Arranger Introspection          |
| **Introspection snapshot**   | A frozen copy of that schema, pinned by commit hash so everyone evaluates the same version.                                                                                                   | Arranger Introspection          |
| **LLM**                      | Large language model; here, the system that turns a question into a query.                                                                                                                    | The LLM                         |
| **MCP**                      | Model Context Protocol — open standard connecting models to tools and data ("USB-C for AI").                                                                                                  | MCP                             |
| **MCP client**               | The connector routing requests from host to MCP servers.                                                                                                                                      | MCP                             |
| **MCP host**                 | The application the researcher interacts with (Chainlit in Aim 1).                                                                                                                            | MCP                             |
| **MCP server**               | Exposes capabilities to the model; the project builds one wrapping the Arranger API.                                                                                                          | MCP                             |
| **MoE (Mixture of Experts)** | Architecture where only a subset of parameters is active per token (e.g. "109B / 17B active").                                                                                                | The LLM                         |
| **Open-weights**             | Models that can be downloaded and run locally (e.g. Mistral, Qwen, Gemma, Llama).                                                                                                             | The LLM                         |
| **Overture**                 | Open-source toolkit for building large biomedical data platforms.                                                                                                                             | The Platform                    |
| **Parameters**               | The measure of model size (e.g. 7B = 7 billion).                                                                                                                                              | The LLM                         |
| **Primitives**               | The three MCP capability types: tools, resources, and prompts.                                                                                                                                | Primitives                      |
| **Prompts (MCP)**            | Pre-defined workflows the server exposes (e.g. `query_arranger`).                                                                                                                             | Primitives                      |
| **Quantization**             | Storing model weights at lower precision to cut memory use, with a small accuracy tradeoff (e.g. `Q4_K_M`, `FP8`).                                                                            | The LLM                         |
| **Query**                    | Here, the three components together: SQON filter + GraphQL field selection + (optional) aggregation.                                                                                          | The Query                       |
| **Reference query**          | The correct hand-authored answer a fixture is scored against.                                                                                                                                 | Fixtures and Execution Accuracy |
| **Resources (MCP)**          | Read-only data the model can fetch (e.g. the SQON grammar, catalogue fields).                                                                                                                 | Primitives                      |
| **SQON**                     | Serializable Query Object Notation — Overture's JSON filter format, supporting `AND`/`OR`/`NOT` over fields.                                                                                  | The Filter Language             |
| **stdio**                    | Standard input/output transport, for terminal and command-line clients.                                                                                                                       | Transports                      |
| **Streamable HTTP**          | HTTP-based transport supporting streaming responses, for GUI clients like Chainlit.                                                                                                           | Transports                      |
| **Temperature**              | Output-randomness control; at temperature 0 the model is deterministic.                                                                                                                       | The LLM                         |
| **Token**                    | The unit models read and write in (~3/4 of a word); each has a cost in money and context space.                                                                                               | The LLM                         |
| **Tool calling**             | A model invoking a named function with structured arguments instead of producing only text.                                                                                                   | The LLM                         |
| **Tools (MCP)**              | Actions the model can invoke (e.g. `execute_query`).                                                                                                                                          | Primitives                      |
| **Transport**                | The communication protocol between host and server (stdio or Streamable HTTP).                                                                                                                | Transports                      |
