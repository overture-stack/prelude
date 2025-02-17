# Composer

Composer is used for generating a base set of configuration files for Overtures platform. It supports the generation of Song schemas, Lectern dictionaries, Elasticsearch mappings, and Arranger configurations.

## Features

- Generate SONG schemas from JSON templates
- Create Lectern dictionaries from CSV files
- Generate Elasticsearch mappings from CSV or JSON data
- Create Arranger configurations for data visualization
- Comprehensive validation of input files and configurations
- Support for multiple execution profiles

## Installation

```bash
# Clone the repository
git clone <repository-url>
cd composer

# Install dependencies
npm install

# Build the project
npm run build
```

## Usage

Composer can be run in several different modes using either the command line directly or through Docker.

### Command Line Usage

```bash
# Basic usage
node dist/main.js --profile <profile> --files <file-paths> [options]

# Generate Song schema
node dist/main.js --profile songSchema -f data/sample.json -n "my-schema"

# Generate Lectern dictionary
node dist/main.js --profile generateLecternDictionary -f data/sample.csv -n "my-dictionary"

# Generate Elasticsearch mapping
node dist/main.js --profile generateElasticSearchMapping -f data/data.csv -i "my-index"

# Generate Arranger configs
node dist/main.js --profile generateArrangerConfigs -f data/data.csv --arranger-config-dir ./configs
```

### Docker Usage

The application can be run using Docker with the provided `docker-compose.yml` file.

```bash
# Basic usage
docker compose --profile <profile-name> up composer

# Example: Generate all configurations
docker compose --profile generateConfigs up composer

# Example: Generate only Song schema
docker compose --profile generateSongSchema up composer

Available profiles:
- generateSongSchema
- generateLecternDictionary
- generateElasticSearchMapping
- generateArrangerConfigs
- generateConfigs (generates all configurations)
```

#### Docker Volume Configuration

The `docker-compose.yml` file sets up the following volume mappings:

```yaml
volumes:
  - ./apps/composer:/composer
  - ./apps/conductor:/conductor
  - ./data:/data
  - ./docker-compose.yml:/docker-compose.yml
```

#### Docker Environment Variables

You can set environment variables either in the `docker-compose.yml` file or using a `.env` file:

```yaml
environment:
  PROFILE: ${PROFILE:-default}
  COMPOSER_PATH: /composer
  TABULAR_DATA_FILE: ${TABULAR_DATA_FILE}
  TABULAR_INDEX_NAME: ${TABULAR_INDEX_NAME}
  FILE_METADATA_SAMPLE: /data/sampleData/fileMetadata.json
  TABULAR_SAMPLE: /data/tabularData.csv
  LYRIC_UPLOAD_DIRECTORY: /data/lyricUploads/
  SONG_UPLOAD_DIRECTORY: /data/songUploads/
  DEFAULT_STUDY_ID: demo
  SONG_SCHEMA: /configs/songSchema
  LECTERN_DICTIONARY: /configs/lecternDictionaries
  ES_MAPPINGS: /configs/elasticsearchConfigs
  ES_CONFIG_DIR: /es-config
  ARRANGER_CONFIG_DIR: /arranger-config
```

### Environment Configuration

Environment variables can be configured in multiple ways:

1. Using a `.env` file in the project root:

```bash
# Required Variables
PROFILE=generateConfigs
TABULAR_DATA_FILE=./data/sample.csv
TABULAR_INDEX_NAME=my-index

# Optional Variables
FILE_METADATA_SAMPLE=/data/sampleData/fileMetadata.json
TABULAR_SAMPLE=/data/tabularData.csv
DEFAULT_STUDY_ID=demo
```

2. Setting variables directly in your shell:

```bash
export PROFILE=generateConfigs
export TABULAR_DATA_FILE=./data/sample.csv
export TABULAR_INDEX_NAME=my-index
docker compose --profile $PROFILE up composer
```

3. Passing variables on the command line:

```bash
PROFILE=generateConfigs TABULAR_DATA_FILE=./data/sample.csv docker compose up composer
```

Default paths in Docker container:

```bash
COMPOSER_PATH=/composer
ES_CONFIG_DIR=/es-config
ARRANGER_CONFIG_DIR=/arranger-config
SONG_SCHEMA=/configs/songSchema
LECTERN_DICTIONARY=/configs/lecternDictionaries
ES_MAPPINGS=/configs/elasticsearchConfigs
```

## Command Line Options

```bash
Options:
  -p, --profile <profile>           Execution profile
  -m, --mode <mode>                 Operation mode
  -f, --files <paths...>           Input file paths (space separated)
  -i, --index <name>               Elasticsearch index name
  -o, --output <file>              Output file path
  --arranger-config-dir <path>     Directory for Arranger configs
  -n, --name <name>                Dictionary/Schema name
  -d, --description <text>         Dictionary description
  -v, --version <version>          Dictionary version
  --file-types <types...>          Allowed file types for Song schema
  --delimiter <char>               CSV delimiter (default: ",")
```

## Profiles

### songSchema

Generates a SONG schema from a JSON template file. The schema defines the structure and validation rules for submitting genomic data.

### generateLecternDictionary

Creates a Lectern dictionary from CSV files. The dictionary defines the data model and validation rules for clinical data.

### generateElasticSearchMapping

Generates Elasticsearch mapping from CSV data. The mapping defines how the data should be indexed and searched in Elasticsearch.

### generateArrangerConfigs

Creates Arranger configuration files for data visualization and querying. Includes configurations for:

- Base configuration
- Extended fields
- Table layout
- Facet configuration

### generateConfigs

Generates all configurations in one go. This includes:

- SONG schema
- Lectern dictionary
- Elasticsearch mapping
- Arranger configurations

## File Validation

Composer performs comprehensive validation of input files:

- File existence and accessibility
- CSV header structure and naming
- Data types and formats
- Required fields
- Schema compliance

## Examples

### Generate Song Schema

```bash
node dist/main.js \
  --profile songSchema \
  -f data/template.json \
  -n "my-genomic-schema" \
  --file-types BAM,FASTQ
```

### Generate Lectern Dictionary

```bash
node dist/main.js \
  --profile generateLecternDictionary \
  -f data/clinical.csv \
  -n "clinical-dictionary" \
  -d "Clinical data dictionary" \
  -v "1.0.0"
```

### Generate All Configs

```bash
docker-compose --profile generateConfigs up composer
```

## Error Handling

The tool provides detailed error messages and validation feedback:

- File access errors
- Invalid headers or data formats
- Configuration errors
- Processing failures
