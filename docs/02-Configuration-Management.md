# Configuration Management

## Overview

This guide covers updating and managing configuration files for Postgres, Elasticsearch and Arranger. Configuration files define how your data is indexed, searched, and displayed in the portal.

## Configuration Directory Structure

The `configs/` directory at the project root contains all configuration files:

```
configs/
├── elasticsearchConfigs/     # Elasticsearch index mappings
│   ├── correlation-mapping.json
│   ├── expression-mapping.json
│   ├── mutation-mapping.json
│   └── protein-mapping.json
├── arrangerConfigs/           # Arranger UI configurations
│   ├── correlation/
│   │   ├── base.json         # Core index configuration
│   │   ├── extended.json     # Field display names
│   │   ├── facets.json       # Filter panel settings
│   │   └── table.json        # Table column settings
│   ├── expression/
│   ├── mutation/
│   └── protein/
└── postgresConfigs/           # PostgreSQL table schemas
    ├── correlation.sql
    ├── expression.sql
    ├── mutation.sql
    └── protein.sql
```

> **Note:** The `configs/` directory is symbolically linked to `./apps/conductor/configs/` and mounted as a volume in docker-compose, allowing automated initialization of services.

## Generating Configuration Files with Composer

Composer automates the creation of Elasticsearch, Arranger, and PostgreSQL configuration files from your CSV data.

### Installing Composer

Before generating configurations, you need to install Composer:

1. Navigate to the Composer directory:
   ```bash
   cd apps/composer
   ```

2. Install dependencies and build:
   ```bash
   npm install
   npm run build
   ```

3. Install globally:
   ```bash
   npm install -g .
   ```

4. **Validation:** Run `composer -h` to verify installation. You should see help text outlining the available commands.

<details>
<summary>Alternative: Using without global installation</summary>

If you prefer not to install globally, you can run Composer directly from the project directory:

```bash
cd apps/composer
npm install
npm run build
npm start -- <command> [options]
```

For example:
```bash
npm start -- -p elasticsearchmapping -f ../../data/sample.csv -i my-index -o ../../configs/elasticsearchConfigs/sample-mapping.json
```

</details>

### Prerequisites

1. **Composer must be installed** (see above)
2. **CSV data files prepared** with valid headers
3. **Data files located** in the `data/` directory

### Step 1: Generate Elasticsearch Index Mapping

Create an Elasticsearch mapping from your CSV file:

```bash
composer -p elasticsearchmapping \
  -f ./data/correlation.csv \
  -i correlation \
  -o ./configs/elasticsearchConfigs/correlation-mapping.json
```

<details>
<summary>Command Options</summary>

**Required Options:**
- `-p elasticsearchmapping` - Specifies the Elasticsearch mapping profile
- `-f <file>` - Input CSV file to analyze
- `-i <name>` - Index name for the mapping
- `-o <path>` - Output path for the generated mapping file

**Optional Options:**
- `--delimiter <char>` - CSV delimiter (default: ",")
- `--help` - Show all available options

</details>

**What Composer generates:**
- Index pattern (e.g., `correlation-*`)
- Index alias (e.g., `correlation_centric`)
- Field mappings based on CSV data types
- Metadata structure for tracking submissions

### Step 2: Review Elasticsearch Mapping

After generation, review the mapping file to ensure:

**Index Pattern & Alias:**
```json
{
  "index_patterns": ["correlation-*"],
  "aliases": {
    "correlation_centric": {}
  }
}
```

**Field Types:**
- Verify numeric fields are mapped as `integer`, `float`, or `long`
- Ensure text fields are mapped as `keyword` or `text`
- Check that date fields have appropriate formats

**Settings:**
```json
"settings": {
  "number_of_shards": 1,
  "number_of_replicas": 0
}
```

> **Note:** Default settings (1 shard, 0 replicas) are suitable for development. Adjust for production use.

### Step 3: Generate Arranger Configuration Files

Create Arranger configs from your Elasticsearch mapping:

```bash
composer -p arrangerconfigs \
  -f ./configs/elasticsearchConfigs/correlation-mapping.json \
  -o ./configs/arrangerConfigs/correlation/
```

<details>
<summary>Command Options</summary>

**Required Options:**
- `-p arrangerconfigs` - Specifies the Arranger configs profile
- `-f <file>` - Input Elasticsearch mapping file
- `-o <path>` - Output directory for configuration files

</details>

**What Composer generates:**
- `base.json` - Core index and document type configuration
- `extended.json` - Field names and display labels
- `facets.json` - Filter panel configuration
- `table.json` - Data table column settings

### Step 4: Configure Arranger Files

After generation, update the Arranger configuration files:

#### A) Update base.json

Set the index to match the alias from your Elasticsearch mapping:

```json
{
  "documentType": "file",
  "index": "correlation_centric"
}
```

> **Important:** The `index` field must match the alias name defined in your Elasticsearch mapping template.

#### B) Update extended.json

Customize display names for better user experience:

```json
{
  "extended": [
    {
      "displayName": "Hugo Symbol A",
      "fieldName": "data.hugo_symbol_a"
    },
    {
      "displayName": "Correlation Coefficient",
      "fieldName": "data.spearmancorr"
    }
  ]
}
```

**Tips:**
- Use clear, user-friendly display names
- Keep names concise but descriptive
- Maintain consistent naming conventions

#### C) Update table.json

Configure which columns appear in the data table:

```json
{
  "columns": [
    {
      "field": "data.hugo_symbol_a",
      "show": true,
      "canChangeShow": true,
      "sortable": true
    },
    {
      "field": "data.spearmancorr",
      "show": true,
      "canChangeShow": false,
      "sortable": true
    }
  ]
}
```

**Configuration Options:**
- `show`: Display column by default (true/false)
- `canChangeShow`: Allow users to hide/show column (true/false)
- `sortable`: Enable sorting on this column (true/false)

For detailed table configuration options, see [Arranger Table Configuration](https://docs.overture.bio/docs/core-software/Arranger/usage/arranger-components#table-configuration-tablejson).

#### D) Update facets.json

Configure filter panel facets:

```json
{
  "facets": [
    {
      "field": "data.cancer_type",
      "active": true,
      "show": true
    },
    {
      "field": "data.dataset_name",
      "active": false,
      "show": true
    }
  ]
}
```

**Configuration Options:**
- `active`: Expand facet by default (true/false)
- `show`: Display facet in filter panel (true/false)
- Order determines display order in the UI

For detailed facet configuration options, see [Arranger Facet Configuration](https://docs.overture.bio/docs/core-software/Arranger/usage/arranger-components#facet-configuration-facetsjson).

## PostgreSQL Configuration

PostgreSQL configurations define table schemas for storing your data. These SQL files create tables that match your CSV structure and can be used for data persistence before indexing to Elasticsearch.

### Generating PostgreSQL Schema with Composer

Create a PostgreSQL table schema from your CSV file:

```bash
composer -p postgresschema \
  -f ./data/correlation.csv \
  -o ./configs/postgresConfigs/correlation.sql
```

<details>
<summary>Command Options</summary>

**Required Options:**
- `-p postgresschema` - Specifies the PostgreSQL schema profile
- `-f <file>` - Input CSV file to analyze
- `-o <path>` - Output path for the generated SQL file

**Optional Options:**
- `--delimiter <char>` - CSV delimiter (default: ",")
- `--table-name <name>` - Custom table name (default: derived from filename)

</details>

**What Composer generates:**
- `CREATE TABLE IF NOT EXISTS` statement
- Column definitions with appropriate data types
- `submission_metadata` JSONB column for tracking
- Index on submission_id for query performance
- Example queries for common operations

### Understanding PostgreSQL Schema Files

After generation, review the SQL file structure:

#### Table Creation Statement

```sql
CREATE TABLE IF NOT EXISTS correlation (
  n SMALLINT,
  hugo_symbol_a VARCHAR(50),
  entrez_gene_id_a VARCHAR(50),
  hugo_symbol_b VARCHAR(50),
  entrez_gene_id_b INTEGER,
  spearmancorr DECIMAL(10,3),
  spearmanp VARCHAR(50),
  pearsoncorr DECIMAL(10,3),
  pearsonp VARCHAR(50),
  -- Additional columns...
  submission_metadata JSONB
);
```

**Data Type Mappings:**

Composer automatically maps CSV data to PostgreSQL types:

| CSV Data Type | PostgreSQL Type | Notes |
|---------------|----------------|-------|
| Small integers | SMALLINT | Values < 32,767 |
| Standard integers | INTEGER | Most numeric values |
| Large integers | BIGINT | Very large numbers |
| Decimals | DECIMAL(10,3) | Precision for calculations |
| Short text | VARCHAR(50) | Efficient for short strings |
| Long text | TEXT | Unlimited length text |
| Boolean-like | VARCHAR(50) | "true"/"false" strings |

#### Metadata Column

The `submission_metadata` JSONB column tracks:
- `submission_id` - Unique identifier for the upload
- `source_file_hash` - MD5 hash of source file
- `processed_at` - Timestamp of processing
- `record_number` - Position in source file

#### Performance Index

```sql
CREATE INDEX IF NOT EXISTS idx_correlation_submission_id
ON correlation ((submission_metadata->>'submission_id'));
```

This index speeds up queries filtering by submission ID.

### Using PostgreSQL Schemas

#### Option 1: Automatic Schema Application

When using Conductor's `dbupload` or `indexDb` commands with the `-f` flag, schemas are applied automatically:

```bash
# Upload creates table if it doesn't exist
conductor dbupload -f ./data/correlation.csv -t correlation
```

The table is created based on CSV headers if it doesn't exist.

#### Option 2: Manual Schema Application

Apply the schema manually before uploading data:

```bash
# Connect to PostgreSQL
psql -h localhost -p 5435 -U admin -d overtureDb

# Run the schema file
\i /path/to/configs/postgresConfigs/correlation.sql

# Verify table creation
\dt
\d correlation
```

#### Option 3: Docker Exec

Apply schema from outside the container:

```bash
docker exec -i postgres psql -U admin -d overtureDb < ./configs/postgresConfigs/correlation.sql
```

### Modifying PostgreSQL Schemas

When you need to update table structure:

#### Adding New Columns

```sql
-- Add a new column to existing table
ALTER TABLE correlation
ADD COLUMN new_field VARCHAR(100);

-- Add with default value
ALTER TABLE correlation
ADD COLUMN status VARCHAR(20) DEFAULT 'active';
```

#### Changing Column Types

```sql
-- Change column type (may require data conversion)
ALTER TABLE correlation
ALTER COLUMN spearmancorr TYPE DECIMAL(15,5);
```

#### Adding Indexes

```sql
-- Add index for frequently queried columns
CREATE INDEX idx_correlation_cancer_type
ON correlation (cancer_type);

-- Add compound index
CREATE INDEX idx_correlation_genes
ON correlation (hugo_symbol_a, hugo_symbol_b);
```

#### Adding Constraints

```sql
-- Add primary key
ALTER TABLE correlation
ADD COLUMN id SERIAL PRIMARY KEY;

-- Add unique constraint
ALTER TABLE correlation
ADD CONSTRAINT unique_gene_pair
UNIQUE (hugo_symbol_a, hugo_symbol_b, cancer_type);

-- Add check constraint
ALTER TABLE correlation
ADD CONSTRAINT check_correlation_range
CHECK (spearmancorr >= -1 AND spearmancorr <= 1);
```

### PostgreSQL Configuration Best Practices

**Data Types:**
- Use appropriate numeric types to save space
- Use VARCHAR with reasonable limits for known-length fields
- Use TEXT for variable-length fields without known limit
- Use JSONB (not JSON) for metadata - it's faster for queries

**Indexing:**
- Index foreign key columns
- Index columns used in WHERE clauses
- Index columns used in JOIN conditions
- Avoid over-indexing (slows down INSERT/UPDATE)
- Use compound indexes for multi-column queries

**Schema Organization:**
- One schema file per table/dataset
- Keep naming consistent with Elasticsearch indexes
- Document custom constraints or business rules
- Version control all schema files

**Performance:**
- Use `ANALYZE` after large data loads
- Regularly `VACUUM` tables
- Monitor index usage with `pg_stat_user_indexes`
- Consider partitioning for very large tables

### Querying PostgreSQL Data

After data is loaded, use these query patterns:

#### Basic Queries

```sql
-- Select all data
SELECT * FROM correlation LIMIT 10;

-- Filter by metadata
SELECT * FROM correlation
WHERE submission_metadata->>'submission_id' = 'abc123';

-- Get submission info
SELECT
  submission_metadata->>'source_file_hash' as file_hash,
  submission_metadata->>'processed_at' as processed_date,
  COUNT(*) as record_count
FROM correlation
GROUP BY file_hash, processed_date;
```

#### Advanced Queries

```sql
-- Find correlations above threshold
SELECT hugo_symbol_a, hugo_symbol_b, spearmancorr
FROM correlation
WHERE spearmancorr > 0.8
ORDER BY spearmancorr DESC;

-- Aggregate by cancer type
SELECT
  cancer_type,
  COUNT(*) as pair_count,
  AVG(spearmancorr) as avg_correlation
FROM correlation
GROUP BY cancer_type;

-- Join with metadata filtering
SELECT c.*,
  c.submission_metadata->>'processed_at' as upload_date
FROM correlation c
WHERE c.cancer_type = 'BRCA'
  AND (c.submission_metadata->>'processed_at')::timestamp > '2024-01-01';
```

### PostgreSQL to Elasticsearch Workflow

The typical workflow using PostgreSQL configs:

1. **Generate PostgreSQL schema** from CSV:
   ```bash
   composer -p postgresschema -f ./data/correlation.csv -o ./configs/postgresConfigs/correlation.sql
   ```

2. **Upload data to PostgreSQL**:
   ```bash
   conductor dbupload -f ./data/correlation.csv -t correlation
   ```

3. **Verify data in PostgreSQL**:
   ```bash
   psql -h localhost -p 5435 -U admin -d overtureDb -c "SELECT COUNT(*) FROM correlation;"
   ```

4. **Index to Elasticsearch**:
   ```bash
   conductor indexDb -t correlation -i correlation-index
   ```

This workflow provides:
- **Data persistence** in PostgreSQL
- **Search capabilities** in Elasticsearch
- **Single source of truth** for your data
- **Flexibility** to reindex without re-uploading CSVs

## Manual Configuration Updates

For advanced use cases or fine-tuning, you can manually edit configuration files.

### Updating Elasticsearch Mappings

When manually updating Elasticsearch mappings:

1. **Modify the mapping file** in `configs/elasticsearchConfigs/`
2. **Update field types** as needed:
   ```json
   "properties": {
     "my_field": {
       "type": "keyword"  // Change type as needed
     }
   }
   ```
3. **Adjust index settings** for production:
   ```json
   "settings": {
     "number_of_shards": 3,
     "number_of_replicas": 1
   }
   ```

> **Warning:** Changing mappings requires reindexing your data. See [Reindexing Guide](#reindexing-data) below.

### Updating Arranger Configurations

When manually updating Arranger configs:

1. **Edit the specific JSON file** in `configs/arrangerConfigs/<dataset>/`
2. **Validate JSON syntax** after changes
3. **Test changes** in a development environment first

**Common manual updates:**
- Reordering facets or table columns
- Changing display names
- Enabling/disabling specific features
- Adjusting default states (active/show)

## Applying Configuration Changes

After updating configuration files, apply changes to your deployment.

### Step 1: Restart Services

Restart your deployment to apply configuration changes:

```bash
make restart
```

**What happens during restart:**
1. All containers are gracefully shut down
2. Configuration files are reloaded
3. Deployment scripts are executed
4. Services restart with updated configurations
5. Data is preserved (unlike `make reset`)

> **Note:** The restart command uses the `demo` profile by default. Modify the Makefile if using a different profile.

### Step 2: Rebuild Stage Image (If Needed)

If you modified Stage UI configurations, rebuild the Stage image:

```bash
docker rmi stageimage:1.0
make restart
```

**When to rebuild Stage:**
- Updated Stage component files
- Modified Stage environment variables
- Changed Stage theme or UI components
- Updated Next.js configuration

> **Note:** Rebuilding Stage may take several minutes as it recompiles the Next.js application.

### Step 3: Verify Changes

After restart, verify your configuration changes:

**Check Elasticsearch:**
```bash
# Verify index template
curl -X GET "http://localhost:9200/_index_template/correlation_template" \
  -u elastic:myelasticpassword

# Check index exists
curl -X GET "http://localhost:9200/_cat/indices/correlation-*" \
  -u elastic:myelasticpassword
```

**Check Arranger:**
```bash
# Test Arranger health
curl http://localhost:5050/health

# Query Arranger GraphQL endpoint
curl -X POST http://localhost:5050/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ file { hits { total } } }"}'
```

**Check Stage UI:**
1. Navigate to http://localhost:3000
2. Go to your data exploration page
3. Verify facets display correctly
4. Check table columns match configuration
5. Test search and filter functionality

## Additional Resources

- [Arranger Component Configuration](https://docs.overture.bio/docs/core-software/Arranger/usage/arranger-components)
- [Elasticsearch Mapping Documentation](https://www.elastic.co/guide/en/elasticsearch/reference/7.17/mapping.html)
- [Elasticsearch Index Templates](https://www.elastic.co/guide/en/elasticsearch/reference/7.17/index-templates.html)
