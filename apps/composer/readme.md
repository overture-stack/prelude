# Composer

A command-line tool for processing CSV files into various formats:

- Lectern Data Dictionaries
- Elasticsearch Mappings
- Arranger Configurations
- Elasticsearch documents

The Composer is also able to upload processed elasticsearch documentents into Elasticsearch

## Installation

```bash
npm install composer
```

## Usage

The Composer supports several modes of operation:

### Dictionary Mode

Generate a Lectern data dictionary from one or more CSV files. Each CSV file becomes a schema in the dictionary.

```bash
composer --mode dictionary \
  --name my-dictionary \
  --files data1.csv data2.csv \
  --description "My data dictionary" \
  --version 1.0.0 \
  --output dictionary.json
```

### Mapping Mode

Generate Elasticsearch mapping from CSV:

```bash
composer --mode mapping \
  --files data.csv \
  --output mapping.json
```

### Arranger Mode

Generate Arranger configuration files:

```bash
composer --mode arranger \
  --files data.csv \
  --index my-index \
  --arranger-config-dir ./arranger-config
```

### Upload Mode

Upload CSV data directly to Elasticsearch:

```bash
composer --mode upload \
  --files data.csv \
  --index my-index \
  --url http://localhost:9200 \
  --user elastic \
  --password mypassword \
  --batch-size 1000
```

### Combined Mode

Generate both mapping and Arranger configurations:

```bash
composer --mode all \
  --files data.csv \
  --index my-index \
  --output mapping.json \
  --arranger-config-dir ./arranger-config
```

## Options

| Option                  | Description                                                             | Default                               |
| ----------------------- | ----------------------------------------------------------------------- | ------------------------------------- |
| `-m, --mode`            | Operation mode: 'dictionary', 'upload', 'mapping', 'arranger', or 'all' | 'upload'                              |
| `-f, --files`           | CSV file paths (space separated)                                        | Required                              |
| `-n, --name`            | Dictionary name (required for dictionary mode)                          |                                       |
| `-d, --description`     | Dictionary description                                                  | "Generated dictionary from CSV files" |
| `-v, --version`         | Dictionary version                                                      | "1.0.0"                               |
| `-i, --index`           | Elasticsearch index name                                                | "tabular-index"                       |
| `-o, --output`          | Output file path for dictionary or mapping                              |                                       |
| `--arranger-config-dir` | Directory for Arranger configuration files                              |                                       |
| `--url`                 | Elasticsearch URL                                                       | "http://localhost:9200"               |
| `-u, --user`            | Elasticsearch username                                                  | "elastic"                             |
| `-p, --password`        | Elasticsearch password                                                  | "myelasticpassword"                   |
| `-b, --batch-size`      | Batch size for processing                                               | 1000                                  |
| `--delimiter`           | CSV delimiter                                                           | ","                                   |

## Examples

### Creating a Dictionary from Multiple CSVs

If you have clinical data split across multiple CSV files:

```bash
composer --mode dictionary \
  --name clinical-dictionary \
  --files patients.csv diagnoses.csv treatments.csv \
  --description "Clinical data dictionary" \
  --version 1.0.0 \
  --output clinical-dictionary.json
```

### Uploading Large Dataset to Elasticsearch

For large datasets, you can adjust the batch size:

```bash
composer --mode upload \
  --files large-dataset.csv \
  --index clinical-data \
  --batch-size 5000 \
  --url http://elasticsearch:9200
```

## Error Handling

The tool provides detailed error messages and validation:

- CSV file validation
- Header validation
- Schema generation validation
- Elasticsearch connection testing
- Data type inference

## Output

### Dictionary Mode

- Generates a JSON file containing the Lectern dictionary
- Each CSV becomes a schema within the dictionary
- Infers data types from sample values
- Includes metadata and descriptions

### Mapping Mode

- Creates an Elasticsearch mapping JSON file
- Infers field types from data
- Configures appropriate analyzers and settings

### Arranger Mode

Generates four configuration files:

- base.json: Basic index configuration
- extended.json: Extended field configurations
- table.json: Table display settings
- facets.json: Search facet configurations
