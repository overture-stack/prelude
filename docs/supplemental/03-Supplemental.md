# Supplemental

## Architecture Overview

Conductor acts as a data orchestration tool that sits between your data sources and target systems:

```
CSV Files → Conductor → PostgreSQL (optional) → Elasticsearch
```

| Component | Description |
|-----------|-------------|
| **Conductor** | CLI tool for data processing and upload operations |
| **PostgreSQL** |  Intermediate storage for tabular data |
| **Elasticsearch** | Primary search and analytics engine for indexed data |

## Overview

Conductor provides four main commands for data management:

| Command | Description |
|---------|-------------|
| `upload` | Complete pipeline: CSV → PostgreSQL → Elasticsearch |
| `esupload` | Upload CSV data directly to Elasticsearch |
| `dbupload` | Upload CSV data directly to PostgreSQL |
| `indexDb` | Index PostgreSQL table data to Elasticsearch |


## Installation

### Installing from the project directory

Since Conductor is located in the `apps/conductor` directory of the Prelude repo, you can install it locally from that directory:

1. Build the Conductor CLI:
   ```bash
   cd apps/conductor
   npm install
   npm run build
   chmod +x dist/main.js
   cd ../..
   ```

2. Make the wrapper script executable:
   ```bash
   chmod +x conductor.sh
   ```

3. Add the project directory to your PATH:
   ```bash
   echo "export PATH=\"$(pwd):\$PATH\"" >> ~/.bashrc
   source ~/.bashrc
   ```

   > **Note:** If using zsh, replace `~/.bashrc` with `~/.zshrc`. If the utility has been pre-built for you, you only need to run this step.

4. **Validation:** Run `conductor -h` to verify installation. You should see help text outlining the available commands.

## upload Command 

Performs the complete data pipeline: CSV → PostgreSQL → Elasticsearch

**Use case:** When you want both database storage and search capabilities

```bash
conductor upload -f ./data/sample.csv -t my_table -i my-index
```

<details>
<summary>Command Options</summary>

**Key Options:**
- `-f, --file <files...>` - Input CSV files to process
- `-t, --table <name>` - PostgreSQL table name (default: "data")
- `-i, --index <name>` - Elasticsearch index name (default: "data")
- `-b, --batch-size <size>` - Batch size for operations (default: 1000)
- `--delimiter <char>` - CSV delimiter character (default: ",")

**Database Options:**
- `--db-host <host>` - PostgreSQL host:port (default: "localhost:5435")
- `--db-name <name>` - PostgreSQL database name (default: "overtureDb")
- `--db-user <user>` - PostgreSQL username (default: "admin")
- `--db-pass <password>` - PostgreSQL password (default: "admin123")

**Elasticsearch Options:**
- `--es-host <host>` - Elasticsearch host:port (default: "localhost:9200")
- `--es-user <username>` - Elasticsearch username (default: "elastic")
- `--es-pass <password>` - Elasticsearch password (default: "myelasticpassword")

</details>

## esupload Command

Uploads CSV data directly to Elasticsearch without PostgreSQL intermediate storage.

**Use case:** When you only need search capabilities without database storage

```bash
conductor esupload -f ./data/sample.csv -i my-index
```

<details>
<summary>Command Options</summary>

**Key Options:**
- `-f, --file <files...>` - Input CSV files to process (required)
- `-i, --index <name>` - Elasticsearch index name (required)
- `-b, --batch-size <size>` - Batch size for uploads (default: 1000)
- `--delimiter <char>` - CSV delimiter character (default: ",")

**Elasticsearch Options:**
- `--es-host <host>` - Elasticsearch host:port (default: "localhost:9200")
- `--es-user <username>` - Elasticsearch username (default: "elastic")
- `--es-pass <password>` - Elasticsearch password (default: "myelasticpassword")

</details>

**Example with custom configuration:**
```bash
conductor esupload \
  -f ./data/patients.csv \
  -i patients-2024 \
  --es-host production-es:9243 \
  --es-user search_user \
  --es-pass secure_password \
  -b 500
```

### 3. dbupload Command

Uploads CSV data directly to a PostgreSQL database table.

**Use case:** When you need to store data in PostgreSQL for later processing or analysis

```bash
conductor dbupload -f ./data/sample.csv -t my_table
```

<details>
<summary>Command Options</summary>

**Key Options:**
- `-f, --file <files...>` - Input CSV files to process (required)
- `-t, --table <name>` - Database table name (required)
- `-b, --batch-size <size>` - Batch size for uploads (default: 1000)
- `--delimiter <char>` - CSV delimiter character (default: ",")

**Database Options:**
- `--db-host <host>` - PostgreSQL host:port (default: "localhost:5435")
- `--db-name <name>` - PostgreSQL database name (default: "overtureDb")
- `--db-user <user>` - PostgreSQL username (default: "admin")
- `--db-pass <password>` - PostgreSQL password (default: "admin123")

</details>

**Example with custom database:**
```bash
conductor dbupload \
  -f ./data/clinical_data.csv \
  -t clinical_records \
  --db-host postgres-prod:5432 \
  --db-name clinical_db \
  --db-user data_loader \
  --db-pass secure_password
```

**Important Notes:**
- Table name must be explicitly provided for data safety
- If the table doesn't exist, it will be created automatically
- CSV headers map directly to table columns
- Includes automatic metadata tracking (source file, timestamp, etc.)

## indexDb Command

Reads data from a PostgreSQL table and indexes it to Elasticsearch. Can optionally upload CSV files first.

**Use case:** When you have data in PostgreSQL and want to make it searchable in Elasticsearch

```bash
# Index existing PostgreSQL table data
conductor indexDb -t my_table -i my-index

# Upload CSV to PostgreSQL, then index to Elasticsearch
conductor indexDb -f ./data/sample.csv -t my_table -i my-index
```

<details>
<summary>Command Options</summary>

**Key Options:**
- `-f, --file <files...>` - Optional: CSV files to upload first
- `-t, --table <name>` - PostgreSQL table name (required)
- `-i, --index <name>` - Elasticsearch index name (required)
- `-b, --batch-size <size>` - Batch size for operations (default: 1000)

**Database Options:**
- `--db-host <host>` - PostgreSQL host:port (default: "localhost:5435")
- `--db-name <name>` - PostgreSQL database name (default: "overtureDb")
- `--db-user <user>` - PostgreSQL username (default: "admin")
- `--db-pass <password>` - PostgreSQL password (default: "admin123")

**Elasticsearch Options:**
- `--es-host <host>` - Elasticsearch host:port (default: "localhost:9200")
- `--es-user <username>` - Elasticsearch username (default: "elastic")
- `--es-pass <password>` - Elasticsearch password (default: "myelasticpassword")

</details>

**Example workflow:**
```bash
# Step 1: Upload multiple CSV files to PostgreSQL
conductor dbupload -f ./data/patients_*.csv -t patients

# Step 2: Index the PostgreSQL data to Elasticsearch
conductor indexDb -t patients -i patients-index

# Or combine both steps:
conductor indexDb -f ./data/patients_*.csv -t patients -i patients-index
```

## CSV File Requirements

### Header Naming Conventions

**Prohibited Characters:**
Avoid using `: > < . [space] , / \ ? # [ ] { } " * | + @ & ( ) ! ^` in column headers.

**Length Restriction:**
Maximum header length is 255 characters.

**Reserved Words:**
Do not use these as column headers:
`_type`, `_id`, `_source`, `_all`, `_parent`, `_field_names`, `_routing`, `_index`, `_size`, `_timestamp`, `_ttl`, `_meta`, `_doc`, `__typename`, `__schema`, `__type`

**Best Practices:**
- Use snake_case or camelCase
- Keep headers descriptive but concise
- Avoid special characters and spaces
- Use lowercase letters

**Examples:**
- ✅ Good: `user_id,first_name,last_name,email_address`
- ❌ Bad: `User ID!,First Name,Email@Address`

### File Format

- **Format:** CSV (Comma-Separated Values) or TSV (Tab-Separated Values)
- **Encoding:** UTF-8 recommended
- **Headers:** First row must contain column headers
- **Empty values:** Allowed (treated as NULL)

### Debug Mode

Enable debug mode for detailed error information:

```bash
conductor esupload -f data.csv -i my-index --debug
```

This will show:
- Detailed connection information
- Validation steps
- Processing progress
- Full error stack traces

## Support & Contributions

For support, feature requests, and bug reports, please see our [Support Guide](/documentation/support).

For detailed information on how to contribute to this project, please see our [Contributing Guide](/documentation/contribution).
