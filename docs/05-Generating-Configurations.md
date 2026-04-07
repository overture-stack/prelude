# Generating Configurations

Composer is a CLI tool included that auto-generates configuration files from your data. Instead of writing PostgreSQL schemas, Elasticsearch mappings, and Arranger configs by hand, Composer parses your CSV structure and produces a basic template of each for you.

In this section, we'll install Composer, generate all three types of configuration, and review what was created.

### Installing Composer

Composer requires **Node.js** (v18+) and **npm** to be installed. Verify you have them:

```bash
node -v
npm -v
```

:::important
If these commands aren't recognized, install Node.js from [nodejs.org](https://nodejs.org/) before continuing.
:::

Navigate to the Composer directory and install it:

```bash
cd apps/composer
npm install
npm run build
chmod +x dist/main.js
npm install -g .
```

Verify the installation from the project root:

```bash
cd ../..
composer -h
```

You should see help text listing the available commands.

<details>
<summary>**Alternative:** running Composer without global installation</summary>

Use this if you don't have permission to install npm packages globally (e.g. on a managed or shared machine), or if you prefer not to modify your global npm environment:

```bash
cd apps/composer
npm install
npm run build
npm start -- help
```

</details>

:::info
Run all `composer` commands from the **root of the `prelude` repository** (i.e. where `docker-compose.yml` lives), unless you are using the alternate path commands which must be run from `apps/composer/`.
:::

### Step 1: Table Schema

PostgreSQL serves as persistent storage for your data. Records are loaded here first by Conductor, then indexed into Elasticsearch. Composer generates the `SQL CREATE TABLE` statement from your CSV:

```bash
composer -p PostgresTable -f ./data/datatable1.csv --table-name datatable1 -o ./setup/configs/postgresConfigs/datatable1.sql
```

<details>
<summary>**Command breakdown**</summary>

- `-p PostgresTable`: the operation to perform
- `-f ./data/datatable1.csv`: input CSV file to analyze
- `--table-name datatable1`: name for the PostgreSQL table
- `-o ./setup/configs/postgresConfigs/datatable1.sql`: output path for the generated SQL

**Alternate path (no global install):**

```bash
cd apps/composer && npm start -- -p PostgresTable -f ../../data/datatable1.csv --table-name datatable1 -o ../../setup/configs/postgresConfigs/datatable1.sql
```

</details>

#### Reviewing the Generated Schema

Open the generated file:

```bash
cat setup/configs/postgresConfigs/datatable1.sql
```

Composer infers SQL column types from your data (e.g., `VARCHAR` for text, `SMALLINT` or `INTEGER` for numbers) and adds a `submission_metadata JSONB` column for tracking metadata. The table uses `CREATE TABLE IF NOT EXISTS` so it's safe to re-run.

In the dropdown below we've included a breakdown the generated schema for the workshop's demo dataset, a clinical/oncology CSV with 23 data columns:

<details>
<summary>**Click here to see a breakdown of the datatable1.sql**</summary>

```sql showLineNumbers
-- PostgreSQL table creation script
-- Generated from CSV analysis
-- Table: datatable1
-- Columns: 24 (23 data + 1 submission_metadata)

CREATE TABLE IF NOT EXISTS datatable1 (
  donor_id VARCHAR(50),
  gender VARCHAR(50),
  primary_site VARCHAR(50),
  vital_status VARCHAR(50),
  diagnosis_id VARCHAR(50),
  age_at_diagnosis SMALLINT,
  cancer_type VARCHAR(50),
  staging_system VARCHAR(50),
  stage VARCHAR(50),
  specimen_id VARCHAR(50),
  specimen_type VARCHAR(63),
  tissue_source VARCHAR(50),
  sample_id VARCHAR(50),
  sample_type VARCHAR(50),
  treatment_id VARCHAR(50),
  treatment_type VARCHAR(50),
  treatment_start SMALLINT,
  treatment_duration SMALLINT,
  treatment_response VARCHAR(50),
  drug_name VARCHAR(50),
  followup_id VARCHAR(50),
  followup_interval SMALLINT,
  disease_status VARCHAR(50),
  submission_metadata JSONB
);

-- Unique index on submission_id within the JSONB metadata column.
-- Required by Conductor's ON CONFLICT deduplication: if a row with the same
-- submission_id is uploaded again, it is silently skipped instead of duplicated.
DROP INDEX IF EXISTS idx_datatable1_submission_id;
CREATE UNIQUE INDEX IF NOT EXISTS idx_datatable1_submission_id
ON datatable1 ((submission_metadata->>'submission_id'));
```

| Element                         | What it means                                                                                                                                                                                                                           |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `VARCHAR(50)`                   | A variable-length text field with a max of 50 characters. Composer defaults to 50, crease this if any values in your column are longer, otherwise PostgreSQL will truncate or reject them on insert.                                    |
| `SMALLINT`                      | A 2-byte integer supporting values from −32,768 to 32,767. Composer uses this for small whole numbers. Change to `INTEGER` (up to ~2.1 billion) or `BIGINT` if your values can exceed that range.                                       |
| `submission_metadata JSONB`     | A binary JSON column added by Composer and populated by Conductor with each record's tracking info: `submission_id`, `source_file_hash`, and `processed_at`. Do not remove, Conductor depends on it to ensure data is never duplicated. |
| `CREATE TABLE IF NOT EXISTS`    | A conditional create statement, PostgreSQL skips creation if the table already exists, so it's safe to re-run the script without accidentally dropping data.                                                                            |
| Unique index on `submission_id` | Enforces that each uploaded record has a unique submission ID. If Conductor encounters a duplicate during re-upload, it silently skips the row instead of inserting a duplicate or throwing an error.                                   |

</details>

:::tip
For a full reference on PostgreSQL data types and `CREATE TABLE` syntax, see the [PostgreSQL documentation](https://www.postgresql.org/docs/current/datatype.html).
:::

#### Adjusting the Schema

Review the column types. You may want to:

- Increase `VARCHAR` lengths for columns with longer values
- Change `SMALLINT` to `INTEGER` for larger numeric ranges
- Add constraints if needed (e.g., `NOT NULL`)

Make any corrections directly in the SQL file before proceeding.

:::important
The setup service automatically discovers and executes all SQL files in `setup/configs/postgresConfigs/` at startup. Ensure your generated file is saved to this directory before launching the platform.
:::

### Step 2: Index Mappings

An Elasticsearch index mapping defines how your data is structured and stored: field names, data types, and index settings. Composer generates this from your CSV:

```bash
composer -p ElasticsearchMapping -f ./data/datatable1.csv -i datatable1 -o ./setup/configs/elasticsearchConfigs/datatable1-mapping.json
```

<details>
<summary>**Command breakdown**</summary>

- `-p ElasticsearchMapping`: the operation to perform
- `-f ./data/datatable1.csv`: input CSV file to analyze
- `-i datatable1`: name for the Elasticsearch index
- `-o ./setup/configs/elasticsearchConfigs/datatable1-mapping.json`: output path for the generated mapping

**Alternate path (no global install):**

```bash
cd apps/composer && npm start -- -p ElasticsearchMapping -f ../../data/datatable1.csv -i datatable1 -o ../../setup/configs/elasticsearchConfigs/datatable1-mapping.json
```

</details>

#### Reviewing the Generated Mapping

Open the generated file and examine its structure:

```bash
cat setup/configs/elasticsearchConfigs/datatable1-mapping.json
```

Composer infers field types from your CSV data and nests all your columns under a `data` object, with a separate `submission_metadata` object for tracking. In the dropdown below we've included the actual generated mapping for the workshop's demo dataset:

<details>
<summary><strong>Click here to see a breakdown of datatable1-mapping.json</strong></summary>

```json showLineNumbers
{
  "index_patterns": ["datatable1-*"],
  "aliases": {
    "datatable1_centric": {}
  },
  "mappings": {
    "properties": {
      "data": {
        "type": "object",
        "properties": {
          "donor_id": { "type": "keyword" },
          "gender": { "type": "keyword" },
          "primary_site": { "type": "keyword" },
          "vital_status": { "type": "keyword" },
          "diagnosis_id": { "type": "keyword" },
          "age_at_diagnosis": { "type": "integer" },
          "cancer_type": { "type": "keyword" },
          "staging_system": { "type": "keyword" },
          "stage": { "type": "keyword" },
          "specimen_id": { "type": "keyword" },
          "specimen_type": { "type": "keyword" },
          "tissue_source": { "type": "keyword" },
          "sample_id": { "type": "keyword" },
          "sample_type": { "type": "keyword" },
          "treatment_id": { "type": "keyword" },
          "treatment_type": { "type": "keyword" },
          "treatment_start": { "type": "integer" },
          "treatment_duration": { "type": "integer" },
          "treatment_response": { "type": "keyword" },
          "drug_name": { "type": "keyword" },
          "followup_id": { "type": "keyword" },
          "followup_interval": { "type": "integer" },
          "disease_status": { "type": "keyword" }
        }
      },
      "submission_metadata": {
        "type": "object",
        "properties": {
          "submission_id": { "type": "keyword", "null_value": "No Data" },
          "source_file_hash": { "type": "keyword", "null_value": "No Data" },
          "processed_at": { "type": "date" }
        }
      }
    }
  },
  "settings": {
    "number_of_shards": 1,
    "number_of_replicas": 0
  }
}
```

| Element                            | What it means                                                                                                                                                              |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `index_patterns: ["datatable1-*"]` | This template applies to any index whose name starts with `datatable1-`. Elasticsearch uses it automatically when a matching index is created                              |
| `aliases: { datatable1_centric }`  | A stable reference name that Arranger queries. Even if you version your indices, the alias always points to the right one, do not change this without updating `base.json` |
| `data` object                      | All your CSV columns are nested here. This separation keeps your data fields distinct from system metadata                                                                 |
| `keyword` type                     | Exact-match text field, used for categorical values and faceted filtering. Cannot do range queries                                                                         |
| `integer` type                     | Whole number field, supports range queries and numeric aggregations                                                                                                        |
| `submission_metadata` object       | Added by Composer, populated by Conductor. Contains `submission_id`, `source_file_hash`, and `processed_at`, do not remove                                                 |
| `null_value: "No Data"`            | What Elasticsearch displays when a field has no value. Ensures missing data is visible in facets rather than silently absent                                               |
| `number_of_shards: 1`              | Number of primary partitions. One is appropriate for local development; increase for multi-node production clusters                                                        |
| `number_of_replicas: 0`            | Number of copies of each shard. Zero is fine for local dev; set to 1+ in production for redundancy                                                                         |

</details>

:::tip
For a full reference on Elasticsearch mapping types and settings, see the [Elasticsearch mapping documentation](https://www.elastic.co/guide/en/elasticsearch/reference/7.17/mapping.html).
:::

#### Adjusting the Mapping

Review the field types. Composer infers types from your data, but you may want to adjust:

- Ensure numeric fields are typed as `integer` or `float`, not `keyword`
- Ensure date fields are typed as `date`
- Categorical fields should remain `keyword`

Make any corrections directly in the JSON file before proceeding.

:::info
Date fields in particular can be problematic. Elasticsearch is strict about date formats, if your data contains dates in mixed formats (e.g. `2024-01-15` alongside `01/15/2024`), or includes timestamps with timezone offsets, indexing will fail. It's safest to normalise all date values to ISO 8601 format (`YYYY-MM-DD` or `YYYY-MM-DDTHH:mm:ssZ`) before loading. If you're unsure, leaving a date field typed as `keyword` will allow it to index without errors, though you'll lose date-range filtering.
:::

### Step 3: Arranger Configs

Arranger configuration files control the search API and UI components. Composer generates these from the Elasticsearch mapping:

```bash
composer -p ArrangerConfigs -f ./setup/configs/elasticsearchConfigs/datatable1-mapping.json -o ./setup/configs/arrangerConfigs/datatable1/
```

<details>
<summary>**Command breakdown**</summary>

- `-p ArrangerConfigs`: the operation to perform
- `-f ./setup/configs/elasticsearchConfigs/datatable1-mapping.json`: input Elasticsearch mapping
- `-o ./setup/configs/arrangerConfigs/datatable1/`: output directory for Arranger config files

**Alternate path (no global install):**

```bash
cd apps/composer && npm start -- -p ArrangerConfigs -f ../../setup/configs/elasticsearchConfigs/datatable1-mapping.json -o ../../setup/configs/arrangerConfigs/datatable1/
```

</details>

This generates four files:

```plaintext
setup/configs/arrangerConfigs/datatable1/
├── base.json       # Core configuration (index name, document type)
├── extended.json   # Field display names
├── table.json      # Data table column configuration
└── facets.json     # Filter panel configuration
```

#### Reviewing and Customizing Each File

Composer generates four files from your Elasticsearch mapping. Each controls a different aspect of the portal. Review and customize each before launching.

#### base.json

`base.json` tells Arranger which Elasticsearch index to query and what document type to use.

<details>
<summary><strong>Click here to see a breakdown of the base.json</strong></summary>

```json showLineNumbers
{
  "documentType": "file",
  "esIndex": "datatable1-index"
}
```

| Field          | What it means                                                                                                               |
| -------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `documentType` | The logical name for the document type. Used internally by Arranger, typically left as `"file"`                             |
| `esIndex`      | The Elasticsearch index or alias that Arranger queries. Must match the alias defined in your mapping (`datatable1_centric`) |

</details>

:::important
Update `esIndex` to match the **alias** from your Elasticsearch mapping (`datatable1_centric`), not the index name pattern (`datatable1-*`). Arranger queries through the alias so it always points to the correct index.
:::

#### extended.json

`extended.json` maps internal field names to human-readable display names shown in the portal UI. Composer generates these automatically by converting `snake_case` to Title Case. Review and adjust any that don't read well.

<details>
<summary><strong>Click here to see a breakdown of the extended.json</strong></summary>

```json showLineNumbers
{
  "extended": [
    {
      "displayName": "Donor Id",
      "fieldName": "data.donor_id"
    },
    {
      "displayName": "Age At Diagnosis",
      "fieldName": "data.age_at_diagnosis"
    },
    {
      "displayName": "Cancer Type",
      "fieldName": "data.cancer_type"
    }
  ]
}
```

| Field         | What it means                                                                                                           |
| ------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `fieldName`   | The full dot-notation path to the field in Elasticsearch (e.g. `data.donor_id`). Must match the mapping exactly         |
| `displayName` | The label shown to users in the portal UI for this field. Edit these freely, they have no effect on the underlying data |

</details>

:::tip
For a full reference on `extended.json`, see the [Arranger extended configuration docs](https://docs.overture.bio/docs/core-software/Arranger/usage/arranger-components).
:::

#### table.json

`table.json` controls which columns appear in the data table on the exploration page, whether users can toggle them, and whether they are sortable.

<details>
<summary><strong>Click here to see a breakdown of the table.json</strong></summary>

```json showLineNumbers
{
  "table": {
    "rowIdFieldName": "submission_metadata.submission_id",
    "columns": [
      {
        "canChangeShow": true,
        "fieldName": "data.donor_id",
        "show": true,
        "sortable": true,
        "jsonPath": "$.data.donor_id",
        "query": "data { donor_id }"
      },
      {
        "canChangeShow": true,
        "fieldName": "data.cancer_type",
        "show": true,
        "sortable": true,
        "jsonPath": "$.data.cancer_type",
        "query": "data { cancer_type }"
      }
    ]
  }
}
```

| Field            | What it means                                                                                             |
| ---------------- | --------------------------------------------------------------------------------------------------------- |
| `rowIdFieldName` | The field used as a unique row identifier. Defaults to `submission_metadata.submission_id`, do not change |
| `fieldName`      | Dot-notation path to the field in Elasticsearch. Must match the mapping                                   |
| `show`           | Whether the column is visible in the table by default                                                     |
| `canChangeShow`  | Whether users can toggle this column's visibility using the column selector                               |
| `sortable`       | Whether clicking the column header sorts the table. Disable for high-cardinality text fields              |
| `jsonPath`       | JSONPath expression used to extract the value from the response. Matches the field structure              |
| `query`          | The GraphQL sub-selection used to fetch this field. Must reflect the nested structure in your mapping     |

Consider hiding metadata columns (e.g. `submission_metadata.*`) by setting `"show": false` and `"canChangeShow": false`.

</details>

:::tip
For a full reference on `table.json`, see the [Arranger table configuration docs](https://docs.overture.bio/docs/core-software/Arranger/usage/arranger-components#table-configuration-tablejson).
:::

#### facets.json

`facets.json` controls which fields appear as filters in the sidebar. The order of entries determines the display order in the filter panel.

<details>
<summary><strong>Click here to see a breakdown of the facets.json</strong></summary>

```json showLineNumbers
{
  "facets": {
    "aggregations": [
      {
        "active": true,
        "fieldName": "data__gender",
        "show": true
      },
      {
        "active": true,
        "fieldName": "data__cancer_type",
        "show": true
      },
      {
        "active": false,
        "fieldName": "data__donor_id",
        "show": false
      }
    ]
  }
}
```

| Field       | What it means                                                                                                                                                                                   |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `fieldName` | Double-underscore notation for the field path (e.g. `data__cancer_type` for `data.cancer_type`). This is specific to `facets.json` and differs from the dot-notation used in other config files |
| `active`    | Whether the facet is enabled and will appear in the sidebar                                                                                                                                     |
| `show`      | Whether the facet is visible by default (can be used alongside `active` to pre-collapse a facet)                                                                                                |

Remove or deactivate facets that aren't useful for filtering, such as unique ID fields. Reorder entries to put the most important filters at the top.

</details>

:::tip
For a full reference on `facets.json`, see the [Arranger facet configuration docs](https://docs.overture.bio/docs/core-software/Arranger/usage/arranger-components#facet-configuration-facetsjson).
:::

### Checkpoint

Before proceeding, confirm:

- [ ] `setup/configs/postgresConfigs/datatable1.sql` exists and contains a CREATE TABLE statement matching your CSV columns
- [ ] `setup/configs/elasticsearchConfigs/datatable1-mapping.json` exists and contains field mappings
- [ ] `setup/configs/arrangerConfigs/datatable1/` contains `base.json`, `extended.json`, `table.json`, and `facets.json`
- [ ] `base.json` has `"esIndex": "datatable1_centric"` (the alias, not the index name)
- [ ] You've made at least one change to `facets.json` (hidden a facet or reordered entries)

**Next:** We will learn how `docker-compose.yml` picks up these configuration files and wires them into the running services.
