# Composer

A versatile CLI tool for processing CSV and JSON files into various configuration files

## Features

- Generate Lectern dictionaries from CSV files
- Create Song schemas from JSON data
- Upload CSV data to Elasticsearch
- Generate Elasticsearch mappings
- Create Arranger configurations
- Support for multiple operation modes

## Installation

```bash
npm install
npm run build
```

## Usage

The basic command structure is:

```bash
composer -m <mode> -f <files...> [options]
```

### Common Options

- `-m, --mode <mode>` - Operation mode (default: "upload")
  - Available modes: dictionary, Song, upload, mapping, arranger, all
- `-f, --files <paths...>` - Input file paths (space separated) [required]
- `-o, --output <file>` - Output file path for generated schemas or mappings
- `--delimiter <char>` - CSV delimiter (default: ",")

## Mode-Specific Operations

### Dictionary Mode

Generates a Lectern dictionary from CSV files.

```bash
composer -m dictionary \
  -f input1.csv input2.csv \
  -n "My Dictionary" \
  -d "Dictionary description" \
  -v "1.0.0" \
  -o dictionary.json
```

#### Options

- `-n, --name <name>` - Dictionary name [required]
- `-d, --description <text>` - Dictionary description
- `-v, --version <version>` - Dictionary version (default: "1.0.0")

### Song Mode

Generates a Song schema from a JSON file. The input JSON must contain an `experiment` object.

```bash
composer -m Song \
  -f input.json \
  -n "My Schema" \
  --file-types BAM FASTQ \
  -o schema.json
```

#### Example Input JSON

```json
{
  "experiment": {
    "field1": "value1",
    "field2": "value2"
  }
}
```

#### Options

- `-n, --name <name>` - Schema name [required]
- `--file-types <types...>` - Allowed file types for Song schema

### Upload Mode

Uploads CSV data to Elasticsearch.

```bash
composer -m upload \
  -f data.csv \
  -i "my-index" \
  --url "http://localhost:9200" \
  -u "elastic" \
  -p "password" \
  -b 1000
```

#### Options

- `-i, --index <name>` - Elasticsearch index name (default: "tabular-index")
- `--url <url>` - Elasticsearch URL (default: "http://localhost:9200")
- `-u, --user <username>` - Elasticsearch username (default: "elastic")
- `-p, --password <password>` - Elasticsearch password
- `-b, --batch-size <size>` - Batch size for processing (default: "1000")

### Mapping Mode

Generates Elasticsearch mapping from a CSV file.

```bash
composer -m mapping \
  -f data.csv \
  -o mapping.json
```

### Arranger Mode

Generates Arranger configurations from a CSV file.

```bash
composer -m arranger \
  -f data.csv \
  --arranger-config-dir ./config
```

#### Options

- `--arranger-config-dir <path>` - Directory to output Arranger configuration files [required]

### All Mode

Generates both mapping and Arranger configurations.

```bash
composer -m all \
  -f data.csv \
  -o mapping.json \
  --arranger-config-dir ./config
```

## CSV File Requirements

- Files must be properly formatted CSVs
- First row must contain headers
- Headers must be unique
- At least one data row is required
- No empty columns in headers

## Output Files

Depending on the mode, the tool generates:

- **Dictionary Mode**: JSON dictionary file
- **Song Mode**: Song schema JSON file
- **Mapping Mode**: Elasticsearch mapping JSON file
- **Arranger Mode**: Configuration files:
  - `base.json`
  - `extended.json`
  - `table.json`
  - `facets.json`

## Error Handling

The tool provides detailed error messages for:

- Invalid file formats
- Missing required options
- Connection issues
- Validation failures
- Processing errors

## Examples

### Generate a Dictionary with Multiple Files

```bash
composer -m dictionary \
  -f samples.csv donors.csv \
  -n "Clinical Dictionary" \
  -d "Clinical data dictionary" \
  -v "2.0.0" \
  -o clinical-dictionary.json
```

### Generate a Song Schema

```bash
composer -m Song \
  -f sequencing.json \
  -n "DNA Sequencing" \
  --file-types BAM FASTQ \
  -o sequencing-schema.json
```

#### Example Input JSON

```json
{
  "experiment": {
    "study_id": "TEST-CA",
    "sample_id": "SAM123",
    "sequencing_platform": "ILLUMINA",
    "data_type": "WGS"
  }
}
```

### Upload Data with Custom Batch Size

```bash
composer -m upload \
  -f large-dataset.csv \
  -i "clinical-data" \
  -b 5000
```

### Generate All Configurations

```bash
composer -m all \
  -f metadata.csv \
  -i "metadata-index" \
  -o mapping.json \
  --arranger-config-dir ./arranger-config
```
