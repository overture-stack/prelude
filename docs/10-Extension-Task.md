# Data Submission

The workshop uses flat tabular data: each CSV row is an independent record. This works well for many datasets, but some research data is inherently hierarchical: a patient has multiple specimens, each specimen has multiple samples, each sample has multiple assay results. Flattening this into a single table means repeating parent fields on every row, which gets unwieldy and makes it harder to enforce consistency across related records.

If your data fits that pattern, or if you need a defined schema that enforces data quality, a submission workflow that validates records before they reach the database, and an audit trail of what was submitted and when, the right approach is a schema-validated submission workflow. This extension introduces two Overture services that provide exactly that: **Lectern** for data dictionary management and **Lyric** for schema-validated tabular data submission.

:::info
This is an extension task for participants who have completed the core workshop. It introduces concepts and tooling that build on the Arranger and Stage stack you already have running.
:::

### Why Structured Submission Matters

Loading CSVs directly is fast, but it puts the burden of data quality on the person preparing the file. There is nothing stopping someone from submitting the wrong field types, missing required values, or using inconsistent terminology. Over time, this erodes the reliability of the data in the portal.

A schema-validated submission workflow inverts this: the schema is defined once, centrally, and every submission is checked against it before a single record reaches the database. Researchers receive immediate, field-level feedback on what is wrong and why, rather than discovering problems later when data appears malformed in the portal.

### Lectern: Data Dictionaries

Lectern is Overture's data dictionary management service. A **data dictionary** is a formal specification of what your data looks like: the schemas it contains, the fields each schema defines, the type and constraints on each field, and the relationships between schemas.

#### What a Schema Defines

Each schema in a Lectern dictionary corresponds to a data entity: a concept like `participant`, `sample`, or `clinical_record`. Within a schema, each field specifies:

- **Name:** the field identifier (e.g. `sample_id`)
- **Value type:** `string`, `integer`, `number`, `boolean`
- **Is array:** whether the field holds a single value or a list
- **Restrictions:** required status, permitted values (`codeList`), regex patterns, numeric ranges, or conditional logic

<details>
<summary><strong>Example: a minimal Lectern schema</strong></summary>

```json
{
  "name": "sample",
  "description": "Core sample metadata for submitted records",
  "fields": [
    {
      "name": "sample_id",
      "valueType": "string",
      "description": "Unique identifier for the sample",
      "restrictions": { "required": true }
    },
    {
      "name": "tissue_type",
      "valueType": "string",
      "description": "Tissue of origin",
      "restrictions": {
        "required": true,
        "codeList": ["blood", "bone marrow", "lymph node", "tissue"]
      }
    },
    {
      "name": "age_at_diagnosis",
      "valueType": "integer",
      "description": "Patient age in years at time of diagnosis",
      "restrictions": { "range": { "min": 0, "max": 120 } }
    }
  ]
}
```

</details>

A dictionary groups one or more schemas together and is versioned; Lectern tracks changes between versions so you can understand what changed between schema releases and communicate updated requirements to data submitters.

#### The Lectern UI

The **Lectern Viewer** is a web-based interface for exploring and communicating data dictionary requirements. Rather than asking submitters to read raw JSON schema definitions, the viewer renders dictionaries as interactive, searchable tables with expandable validation rules, conditional logic explanations, and downloadable CSV templates pre-formatted for the current schema.

:::info
The Lectern Viewer is currently in active development. It is being built initially for the Pan-Canadian Genome Library (PCGL) and will be available as a standalone component that any Overture deployment can integrate.
:::

Key features of the viewer:

- **Interactive schema tables:** field-by-field documentation with types, restrictions, and examples
- **Version switching:** compare dictionary versions and see what changed between releases
- **Template downloads:** generate CSV templates from the current schema to guide submitters
- **Relationship diagrams:** visualise how schemas connect through shared identifiers

#### Adding Lectern to Your Stack

Lectern requires MongoDB to store dictionaries. Add both to your `docker-compose.yml`:

```yaml showLineNumbers
lectern:
  image: ghcr.io/overture-stack/lectern:latest
  ports:
    - "3000:3000"
  environment:
    MONGO_HOST: lectern-mongo
    MONGO_PORT: 27017
    MONGO_DB: lectern
  depends_on:
    - lectern-mongo

lectern-mongo:
  image: mongo:latest
  ports:
    - "27017:27017"
  environment:
    MONGO_INITDB_ROOT_USERNAME: admin
    MONGO_INITDB_ROOT_PASSWORD: password
```

Once running, the Lectern API is available at `http://localhost:3000` and the Swagger UI at `http://localhost:3000/api-docs`. Use the Swagger UI to create your first dictionary by posting a schema definition.

### Lyric: Tabular Data Submission

Lyric is Overture's tabular data submission service. It sits between data submitters and the database, validating every submission against a Lectern dictionary before any data is committed.

#### How the Submission Workflow Works

Lyric uses a **staged submission** model: data is uploaded and validated incrementally before being committed. This allows submitters to catch and fix errors across multiple uploads rather than needing a perfectly complete file upfront.

1. **Upload:** submit a TSV file against a named schema in a registered Lectern dictionary
2. **Validate:** Lyric checks every row and field against the schema rules: required fields, code lists, ranges, conditional logic
3. **Review:** field-level validation errors are returned immediately; submitters can correct and re-upload
4. **Commit:** once validation passes, data is committed to Lyric's PostgreSQL database
5. **Index:** Maestro picks up the publication event and indexes the new records into Elasticsearch, making them searchable in the portal

#### The Submission UI

:::info
Lyric's submission UI is currently under development. It will provide a browser-based interface for submitting, reviewing, and managing data without needing to interact with the API directly, lowering the barrier for researchers who are not comfortable with command-line tools.
:::

Until the UI is available, submissions are made via Lyric's REST API, documented through Swagger at `http://localhost:3232/api-docs` by default.

#### Adding Lyric to Your Stack

Lyric uses the same PostgreSQL instance as the rest of the workshop stack. Add it to your `docker-compose.yml`:

```yaml showLineNumbers
lyric:
  image: ghcr.io/overture-stack/lyric:latest
  ports:
    - "3232:3232"
  environment:
    LECTERN_URL: http://lectern:3000
    POSTGRES_HOST: postgres
    POSTGRES_PORT: 5432
    POSTGRES_DB: lyric
    POSTGRES_USER: postgres
    POSTGRES_PASSWORD: password
  depends_on:
    - lectern
    - postgres
```

### How It Fits Together

With Lectern and Lyric added, the full submission-to-discovery flow looks like this:

1. **Define your schema** in Lectern: field names, types, required fields, permitted values
2. **Submitters upload data** through Lyric, which validates each row against the Lectern schema
3. **On commit**, Lyric stores records in PostgreSQL
4. **Maestro indexes** the committed data into Elasticsearch
5. **Arranger and Stage** make the indexed data searchable in the portal, exactly as in the core workshop

The portal itself does not change. What changes is the path data takes to get there: instead of a CSV loaded directly by Conductor, data arrives through a validated, audited submission workflow with a defined schema enforcing consistency at every step.

### Further Reading

- [Lectern documentation](https://docs.overture.bio/docs/under-development/lectern/)
- [Building Lectern dictionaries](https://docs.overture.bio/docs/core-software/Lectern/dictionaryReference)
- [Lyric documentation](https://docs.overture.bio/docs/under-development/lyric/)
- [Maestro documentation](https://docs.overture.bio/docs/core-software/Maestro/overview)
- [Overture support forum](https://github.com/overture-stack/roadmap/discussions/categories/support)
