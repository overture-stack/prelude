# Extension Task

Before a single record is submitted, someone has to decide: _what fields exist, what types they hold, what values are permitted, and which are required_. That design work is biocuration, and without a formal tool to capture it, those decisions live in informal documents, shared spreadsheets, and institutional memory. When submitters inevitably interpret things differently, the inconsistencies surface only after data has been collected.

Lectern is Overture's data dictionary management service. It gives those design decisions a persistent, versioned, machine-readable home. Controlled vocabularies become enforced constraints. Schema changes are tracked as diffs rather than email threads. And the same dictionary that guides submitters can drive automated validation at ingestion time.

The portal includes a **Dictionary Playground**: a live editor where you can write a Lectern schema and see it rendered as an interactive table in real time, with no server required.

:::info
This is an extension task for participants who have completed the core workshop.
:::

## Core Concepts

A Lectern **dictionary** groups one or more **schemas** together. Each schema represents a data entity (a concept like `donor` or `specimen`). Within a schema, each **field** specifies:

- **Name:** the field identifier (e.g. `specimen_id`)
- **Value type:** `string`, `integer`, `number`, or `boolean`
- **Restrictions:** required status, permitted values (`codeList`), regex patterns, or numeric ranges

Schemas within a dictionary can reference each other through shared identifier fields, expressing a hierarchy (a donor has specimens) without flattening everything into a single table.

## Step 1: Open the Playground

Navigate to **http://localhost:3000/dictionary/playground**.

The playground opens with a demo dictionary. Clear the editor and replace it with this minimal starting point, a single `donor` entity with one required field:

```json
{
  "name": "my-dictionary",
  "version": "1.0",
  "schemas": [
    {
      "name": "donor",
      "description": "Core donor record",
      "fields": [
        {
          "name": "donor_id",
          "valueType": "string",
          "description": "Unique identifier for the donor",
          "restrictions": { "required": true }
        }
      ]
    }
  ]
}
```

The live preview on the right updates as you type. The validation bar below the editor label shows whether your JSON is a valid Lectern dictionary.

## Step 2: Add Fields with Restrictions

Restrictions are where the curation work lives. Extend the `fields` array with three more fields, each demonstrating a different restriction type:

```json
"fields": [
  {
    "name": "donor_id",
    "valueType": "string",
    "description": "Unique identifier for the donor",
    "restrictions": {
      "required": true,
      "regex": "^DO-[0-9]{3,}$"
    }
  },
  {
    "name": "sex",
    "valueType": "string",
    "description": "Biological sex of the donor",
    "restrictions": {
      "required": true,
      "codeList": ["Female", "Male", "Other", "Unknown"]
    }
  },
  {
    "name": "age_at_diagnosis",
    "valueType": "integer",
    "description": "Age in years at time of primary diagnosis",
    "restrictions": {
      "range": { "min": 0, "max": 120 }
    }
  },
  {
    "name": "primary_diagnosis",
    "valueType": "string",
    "description": "Primary disease or condition",
    "restrictions": { "required": true }
  }
]
```

Watch the preview update. Notice how each restriction type renders differently in the table:

| Restriction      | Field              | What it enforces                                         |
| ---------------- | ------------------ | -------------------------------------------------------- |
| `required: true` | `donor_id`, `sex`  | Field must be present and non-empty in every record      |
| `regex`          | `donor_id`         | Value must match `DO-` followed by at least three digits |
| `codeList`       | `sex`              | Value must be one of the listed options                  |
| `range`          | `age_at_diagnosis` | Integer must fall between 0 and 120 inclusive            |

The `codeList` restriction is one of the most immediately useful tools in biocuration: it turns a naming convention into an enforced constraint. Every submission is checked against the list; values that don't match are rejected before they enter the system.

## Step 3: Add a Second Schema

Dictionaries model relationships, not just individual entities. Add a `specimen` schema that references the donor it was collected from via a shared `donor_id` field:

```json
{
  "name": "specimen",
  "description": "Specimen collected from a donor",
  "fields": [
    {
      "name": "specimen_id",
      "valueType": "string",
      "description": "Unique identifier for the specimen",
      "restrictions": { "required": true }
    },
    {
      "name": "donor_id",
      "valueType": "string",
      "description": "Identifier of the donor this specimen was collected from",
      "restrictions": { "required": true }
    },
    {
      "name": "specimen_type",
      "valueType": "string",
      "description": "Classification of the specimen",
      "restrictions": {
        "required": true,
        "codeList": [
          "Primary tumour",
          "Recurrent tumour",
          "Metastatic tumour",
          "Normal - solid tissue",
          "Normal - blood derived"
        ]
      }
    }
  ]
}
```

Add this object as a second entry in the `schemas` array. The preview now shows two schema tables. The `donor_id` field appears in both; this shared identifier is how hierarchy is expressed: specimens reference donors without collapsing them into a single row.

This is the difference between a flat CSV and a relational data model.

## What Comes Next

The playground validates and previews dictionaries entirely in the browser. To put a dictionary to work (driving submission validation and appearing in the portal's Dictionary Viewer), you connect it to the rest of the Overture stack.

### Lyric: Submission and Validation

[Lyric](https://docs.overture.bio/docs/core-software/lyric/overview) is Overture's data submission service. Once a dictionary is published to a running Lectern server, Lyric uses it to validate incoming records at submission time. Every field restriction you defined (required fields, code lists, regex patterns, numeric ranges) becomes an automated check that runs before a record is accepted. Submitters get immediate, field-level feedback rather than discovering inconsistencies after the fact.

### Maestro: Indexing for Search

[Maestro](https://docs.overture.bio/docs/core-software/maestro/overview) is Overture's indexing service. Once validated data is in the system, Maestro transforms it into Elasticsearch indices that power the portal's search and exploration features. The schema you defined in Lectern informs how fields are indexed; typed fields, controlled vocabularies, and relationships carry through from the dictionary into the search layer.

Together, Lectern -> Lyric -> Maestro form the data pipeline: you define the schema, submitters upload against it, and the resulting data becomes searchable in the portal.

:::tip
The full Lectern schema reference (including all restriction types, versioning, and foreign key syntax) is documented at [docs.overture.bio](https://docs.overture.bio/docs/core-software/Lectern/dictionaryReference).
:::
