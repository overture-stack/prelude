# Generating Configurations

Composer is a CLI tool included that auto-generates configuration files from your data. Instead of writing PostgreSQL schemas, Elasticsearch mappings, and Arranger configs by hand, Composer parses your CSV structure and produces a basic template of each for you.

In this section, we'll install Composer, generate all three types of configuration, and review what was created.

## Installing Composer

Composer requires **Node.js** (v18+) and **npm** to be installed. Verify you have them:

```bash
node -v
npm -v
```

If these commands aren't recognized, install Node.js from [nodejs.org](https://nodejs.org/) before continuing.

Navigate to the Composer directory and install it:

```bash
cd apps/composer
npm install
npm run build
npm install -g .
```

Verify the installation from the project root:

```bash
cd ../..
composer -h
```

You should see help text listing the available commands.

<details>
<summary>Alternative: running Composer without global installation</summary>

Use this if you don't have permission to install npm packages globally (e.g. on a managed or shared machine), or if you prefer not to modify your global npm environment:

```bash
cd apps/composer
npm install
npm run build
npm start -- help
```

</details>

## Step 1: Generate PostgreSQL Table Schema

PostgreSQL serves as persistent storage for your data. Records are loaded here first by Conductor, then indexed into Elasticsearch. Composer generates the SQL CREATE TABLE statement from your CSV:

```bash
composer -p PostgresTable -f ./data/datatable1.csv --table-name datatable1 -o ./setup/configs/postgresConfigs/datatable1.sql
```

<details>
<summary>Command breakdown</summary>

- `-p PostgresTable`: the operation to perform
- `-f ./data/datatable1.csv`: input CSV file to analyze
- `--table-name datatable1`: name for the PostgreSQL table
- `-o ./setup/configs/postgresConfigs/datatable1.sql`: output path for the generated SQL

</details>

### Reviewing the Generated Schema

Open the generated file:

```bash
cat setup/configs/postgresConfigs/datatable1.sql
```

Composer infers SQL column types from your data (e.g., `VARCHAR` for text, `SMALLINT` or `INTEGER` for numbers) and adds a `submission_metadata JSONB` column for tracking metadata. The table uses `CREATE TABLE IF NOT EXISTS` so it's safe to re-run.

### Adjusting the Schema

Review the column types. You may want to:

- Increase `VARCHAR` lengths for columns with longer values
- Change `SMALLINT` to `INTEGER` for larger numeric ranges
- Add constraints if needed (e.g., `NOT NULL`)

Make any corrections directly in the SQL file before proceeding.

> **Note:** SQL files in `setup/configs/postgresConfigs/` are automatically discovered and executed by the setup service when the platform starts.

## Step 2: Generate Elasticsearch Index Mappings

An Elasticsearch index mapping defines how your data is structured and stored: field names, data types, and index settings. Composer generates this from your CSV:

```bash
composer -p ElasticsearchMapping -f ./data/datatable1.csv -i datatable1 -o ./setup/configs/elasticsearchConfigs/datatable1-mapping.json
```

![Elasticsearch Mapping Output](/docs/images/ElasticsearchMapping.png "Terminal output from ElasticsearchMapping")

<details>
<summary>Command breakdown</summary>
122
- `-p ElasticsearchMapping`: the operation to perform
- `-f ./data/datatable1.csv`: input CSV file to analyze
- `-i datatable1`: name for the Elasticsearch index
- `-o ./setup/configs/elasticsearchConfigs/datatable1-mapping.json`: output path for the generated mapping

Run `composer -h` for all available options.

</details>

### Reviewing the Generated Mapping

Open the generated file and examine its structure:

```bash
cat setup/configs/elasticsearchConfigs/datatable1-mapping.json
```

Key elements to understand:

**Index Pattern and Alias:**

```json
{
  "index_patterns": ["datatable1-*"],
  "aliases": {
    "datatable1_centric": {}
  }
}
```

The pattern `datatable1-*` means this template applies to any index starting with `datatable1-`. The alias `datatable1_centric` provides a stable reference name that Arranger and Stage use, even if you create multiple versioned indices, the alias always points to the right data.

**Field Mappings:**

All your CSV columns are nested under a `data` object:

```json
"data": {
  "type": "object",
  "properties": {
    "donor_id": { "type": "keyword", "null_value": "No Data" },
    "age_at_diagnosis": { "type": "integer" },
    "cancer_type": { "type": "keyword", "null_value": "No Data" }
  }
}
```

- **keyword** fields support exact-match filtering (facets)
- **integer** fields support range queries and numeric aggregations
- **null_value** defines what to display when data is missing

**Submission Metadata:**

Composer automatically adds a `submission_metadata` object with tracking fields:

```json
"submission_metadata": {
  "type": "object",
  "properties": {
    "submitter_id": { "type": "keyword" },
    "processed_at": { "type": "date" },
    "source_file": { "type": "keyword" },
    "record_number": { "type": "integer" }
  }
}
```

These fields are populated by Conductor when it loads data and provide some basic traceability for each record.

**Index Settings:**

```json
"settings": {
  "number_of_shards": 1,
  "number_of_replicas": 0
}
```

Elasticsearch splits each index into **shards** (partitions of the data that can be distributed across nodes) and **replicas** (copies of each shard for redundancy and read throughput). One shard and zero replicas is appropriate for local development on a single machine. For production deployments with multiple nodes, you'd increase these for fault tolerance and performance.

### Adjusting the Mapping

Review the field types. Composer infers types from your data, but you may want to adjust:

- Ensure numeric fields are typed as `integer` or `float`, not `keyword`
- Ensure date fields are typed as `date`
- Categorical fields should remain `keyword`

Make any corrections directly in the JSON file before proceeding.

> **Note:** Date fields in particular can be problematic. Elasticsearch is strict about date formats, if your data contains dates in mixed formats (e.g. `2024-01-15` alongside `01/15/2024`), or includes timestamps with timezone offsets, indexing will fail. It's safest to normalise all date values to ISO 8601 format (`YYYY-MM-DD` or `YYYY-MM-DDTHH:mm:ssZ`) before loading. If you're unsure, leaving a date field typed as `keyword` will allow it to index without errors, though you'll lose date-range filtering.

## Step 3: Generate Arranger Configuration Files

Arranger configuration files control the search API and UI components. Composer generates these from the Elasticsearch mapping:

```bash
composer -p ArrangerConfigs -f ./setup/configs/elasticsearchConfigs/datatable1-mapping.json -o ./setup/configs/arrangerConfigs/datatable1/
```

<details>
<summary>Command breakdown</summary>

- `-p ArrangerConfigs`: the operation to perform
- `-f ./setup/configs/elasticsearchConfigs/datatable1-mapping.json`: input Elasticsearch mapping
- `-o ./setup/configs/arrangerConfigs/datatable1/`: output directory for Arranger config files

</details>

This generates four files:

```
setup/configs/arrangerConfigs/datatable1/
├── base.json       # Core configuration (index name, document type)
├── extended.json   # Field display names
├── table.json      # Data table column configuration
└── facets.json     # Filter panel configuration
```

### Reviewing and Customizing Each File

#### base.json: Index Reference

```json
{
  "documentType": "file",
  "index": "datatable1-index"
}
```

**Update the `index` field** to match the alias from your Elasticsearch mapping:

```json
{
  "documentType": "file",
  "index": "datatable1_centric"
}
```

This ensures Arranger queries through the alias rather than a specific index name.

#### extended.json: Field Display Names

This file maps internal field names to human-readable display names. Review and update the `displayName` values, as these appear in the portal UI:

```json
{
  "fieldName": "data.age_at_diagnosis",
  "displayName": "Age at Diagnosis"
}
```

By default, Composer generates display names by converting snake_case to Title Case. Adjust any that don't read well.

#### table.json: Table Column Configuration

Controls the data table on the exploration page:

```json
{
  "fieldName": "data.donor_id",
  "canChangeShow": true,
  "show": true,
  "sortable": true
}
```

- **show**: Whether the column is visible by default
- **canChangeShow**: Whether users can toggle column visibility
- **sortable**: Whether clicking the column header sorts the data

Consider hiding metadata columns (like `submission_metadata.*`) and disabling sorting on high-cardinality text fields.

For details, see the [Arranger table configuration docs](https://docs.overture.bio/docs/core-software/Arranger/usage/arranger-components#table-configuration-tablejson).

#### facets.json: Filter Panel Configuration

Controls the sidebar filters:

```json
{
  "fieldName": "data.cancer_type",
  "active": true,
  "show": true
}
```

- **active**: Whether the facet is enabled
- **show**: Whether it's visible in the sidebar
- The **order of entries** determines the display order in the filter panel

Remove or deactivate facets that aren't useful for filtering (e.g., unique IDs). Reorder entries to put the most important filters at the top.

For details, see the [Arranger facet configuration docs](https://docs.overture.bio/docs/core-software/Arranger/usage/arranger-components#facet-configuration-facetsjson).

## Checkpoint

Before proceeding, confirm:

- [ ] `composer -h` runs without errors
- [ ] `setup/configs/postgresConfigs/datatable1.sql` exists and contains a CREATE TABLE statement matching your CSV columns
- [ ] `setup/configs/elasticsearchConfigs/datatable1-mapping.json` exists and contains field mappings
- [ ] `setup/configs/arrangerConfigs/datatable1/` contains `base.json`, `extended.json`, `table.json`, and `facets.json`
- [ ] `base.json` has `"index": "datatable1_centric"` (the alias, not the index name)
- [ ] You've made at least one change to `facets.json` (hidden a facet or reordered entries)

> **Stuck?** If `composer` isn't found after `npm install -g .`, try running it as `npx composer` from the `apps/composer` directory, or use the alternative method: `cd apps/composer && npm start -- -p ElasticsearchMapping ...`

> **Next:** Wire these configuration files into docker-compose.yml so the services pick them up.
