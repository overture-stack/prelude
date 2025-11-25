# Composer

Composer is a configuration generator tool for Overture. It streamlines the creation of configuration files required by various Overture components.

## Key Features

1. **Configuration Generation**: Composer automates the creation of configurations for different Overture services, including:

   - Elasticsearch mapping configuration
   - Arranger UI configuration
   - Lectern dictionary creation
   - Song schema generation

2. **Command-Line Interface**: Composer offers a unified CLI with consistent command patterns, built-in validation, and helpful error logging to improve the user experience.

## Installation

### Prerequisites

- Node.js 14+
- npm or yarn

### Installing from the project directory

```bash
cd apps/composer
npm install
npm install -g .
```

This installs Composer globally, making composer commands available in your terminal.

### Alternative: Using without global installation

If you prefer not to install globally, you can run Composer directly from the project directory:

```bash
cd apps/composer
npm install
npm start -- <profile> [options]
```

For example:

```bash
npm start -- ElasticsearchMapping -f data.csv -i my-index
```

## Usage

All available commands can be viewed by running `composer --help`.

### Generate Lectern Dictionary

Create a data dictionary from CSV files:

```bash
composer -p LecternDictionary -f clinical.csv demographics.csv -o dictionary.json -n "Clinical Dictionary" -v "2.0.0"
```

Options:

- `-f, --files <paths...>`: Input CSV files (required)
- `-o, --output <path>`: Output file path
- `-n, --name <name>`: Dictionary name
- `-d, --description <text>`: Dictionary description
- `-v, --version <version>`: Dictionary version
- `--delimiter <char>`: CSV delimiter (default: ,)

### Generate SONG Schema

Create a SONG schema from a JSON template:

```bash
composer -p SongSchema -f schema-template.json -o song-schema.json -n "Analysis Schema" --file-types bam vcf fastq
```

Options:

- `-f, --files <paths...>`: Input JSON file (required)
- `-o, --output <path>`: Output file path
- `-n, --name <name>`: Schema name
- `--file-types <types...>`: Allowed file types for SONG schema

### Generate Elasticsearch Mapping

Create an Elasticsearch mapping from CSV or JSON files:

```bash
composer -p ElasticsearchMapping -f data.csv metadata.csv -i my_index --shards 3 --replicas 2 -o es-mapping.json
```

Options:

- `-f, --files <paths...>`: Input files (CSV or JSON, required)
- `-o, --output <path>`: Output file path
- `-i, --index <name>`: Elasticsearch index name
- `--shards <number>`: Number of Elasticsearch shards
- `--replicas <number>`: Number of Elasticsearch replicas
- `--delimiter <char>`: CSV delimiter (default: ,)
- `--ignore-fields <fields...>`: Field names to exclude from mapping
- `--skip-metadata`: Skip adding submission metadata to mapping

### Generate Arranger Configurations

Create Arranger UI configurations from an Elasticsearch mapping:

```bash
composer -p ArrangerConfigs -f mapping.json -o arranger-config/ --arranger-doc-type analysis -i clinical_data
```

Options:

- `-f, --files <paths...>`: Input mapping file (JSON, required)
- `-o, --output <path>`: Output directory
- `--arranger-doc-type <type>`: Arranger document type (file or analysis)
- `-i, --index <name>`: Elasticsearch index name

## Configuration Workflow Example

A typical workflow using Composer might look like:

1. Generate a Lectern dictionary from CSV files:

   ```bash
   composer -p LecternDictionary -f clinical.csv -o dictionary.json
   ```

2. Generate an Elasticsearch mapping from CSV files:

   ```bash
   composer -p ElasticsearchMapping -f clinical.csv -i clinical_data
   ```

3. Generate Arranger configurations from the Elasticsearch mapping:
   ```bash
   composer -p ArrangerConfigs -f generatedConfigs/elasticsearchConfigs/mapping.json
   ```

## Troubleshooting

If you encounter issues:

1. Run with `--debug` flag for detailed logging
2. Check input files for proper formatting
3. Ensure output directories exist and are writable
4. Verify that input files have consistent data formats

For CSV files, ensure headers:

- Contain no special characters
- Are not duplicated
- Follow naming conventions compatible with Elasticsearch
