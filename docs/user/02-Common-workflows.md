# Workflow Examples

This walkthrough uses the **`mutation`** and **`expression`** catalogues to identify candidate genes. It assumes you have already connected an MCP host (LM Studio in this example) to the running server — see [MCP Host Setup](./01-Setup.md).

The loaded data is a small representative sample, so keep the scope in mind while following along: `mutation` covers BRCA only, `expression` covers 32 cancer types, and `correlation` covers DLBC only. Queries outside a catalogue's coverage return no rows — that is expected, not an error.

## Discover available data

In the LM Studio chat, type:

> _What datasets are available?_

The model calls the **`list-catalogues`** tool and returns the catalogues the MCP server exposes: `correlation`, `mutation`, `expression`, `protein`, and `donor`. (A synthetic `fixture` catalogue also exists for platform testing.)

## Explore fields in a catalogue

> _What fields are available in the mutation catalogue?_

The model calls **`get-catalogue-fields`** for the `mutation` catalogue and returns each field with its type and valid filter operators — for example `hugo_symbol`, `cancer_type`, `overall_mutation_frequency`, `is_oncogene`, and `is_tumor_suppressor_gene`.

## Run a natural language query

> _Show me BRCA genes with an overall mutation frequency above 10%_

The model constructs a SQON filter from the field metadata and calls **`execute-query`** to run it against Arranger. Results are returned as a structured table.

## Iterative refinement

> _Which of these genes show elevated average expression?_

The model cross-references the `expression` catalogue using the gene list from the previous step and returns the genes that also meet the expression criterion.

## Follow-up narrowing

> _Of those, which are annotated as oncogenes?_

The model adds an `is_oncogene` filter to narrow the candidate list further.

## Tips for Effective Queries

- **Name the catalogue** — the model performs better when you say which one (e.g. "in the mutation catalogue").
- **Ask about available fields first** if you are unsure what filters are possible.
- **Stay within a catalogue's coverage** — asking `mutation` about a non-BRCA cancer type returns nothing, because only BRCA is loaded.
- **Iterate conversationally** — each follow-up refines the previous result set.
- **Ask the model to explain its reasoning** — it can describe the SQON filter it constructed.
