# Workflow Examples

The Drug Discovery Portal hosts four cancer genomics datasets covering ~405 million records across 32 cancer types. This walkthrough uses the **Mutations** and **Expression** tables to identify candidate genes.

## Discover available data

In the LM Studio chat, type:

> _What datasets are available?_

The model should call `list_catalogs` and returns a list of the four catalogs: `mutations`, `expression`, `correlations`, `proteins`.

## Explore fields in a catalog

> _What fields are available in the mutations catalog?_

The model calls `get_catalog_fields` for the `mutations` catalog and returns a list of field names, types, and valid filter operators (e.g. `gene_id`, `cancer_type`, `mutation_frequency`, `is_hotspot`).

## Run a natural language query

> _Show me genes with greater than 10% mutation frequency with hotspot designation in COADREAD_

The model constructs a SQON filter from the field metadata and executes the query. Results are returned as a structured table.

## Iterative refinement

> _Which of these genes show elevated expression compared to normal tissue?_

The model cross-references the `expression` catalog using the gene list from Step 3 and returns genes meeting both criteria.

## Follow-up narrowing

> _Filter to genes where the correlation with TP53 is above 0.6_

The model queries the `correlations` catalog to further narrow the candidate list.

## Tips for Effective Queries

- **Be specific about the catalog** the model should perform better when you name the table (e.g. "in the mutations table")
- **Ask about available fields first** if you are unsure what filters are possible
- **Iterate conversationally** each follow-up refines the previous result set
- **Ask the model to explain its reasoning** it can describe the filter it constructed
