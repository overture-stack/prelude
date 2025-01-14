# Prelude - Early Release

Rapid development and deployment of proof-of-concept portals.

![Prelude Arch](./images/prelude.png)

Prelude serves as a lightweight proof-of-concept platform, designed to streamline early-stage portal development before committing to full infrastructure deployment. While maintaining essential functionality for data exploration, it minimizes deployment complexity. This approach allows teams to validate their portal requirements and user workflows before transitioning to a more robust production architecture with complete database integration, object storage, and comprehensive API services.

Prelude's architecture serves as a foundation for future expansion, offering a clearer path to scale into the full production system outlined below while preserving your initial development work.

![Complete Arch](./images/complete-architecture.png)

## Repository Structure

```
.
├── Makefile
├── make.bat
├── README.md
├── conductorScripts/ # Scripts that run on startup with the docker compose
├── configurationFiles/ # Elasticsearch mappings, Arranger configs, and nginx configs for server deployments
├── csv-processor/ # Data processing module for CSV ingestion and transformation
├── docker-compose.yml
├── sampleData/ # Sample and test data for development and testing
├── stage/ # Front-end UI Scaffolding and React components
└── volumes/ # Local persistent volumes for elasticsearch and data storage
```

Each directory serves a specific purpose:

- `conductorScripts/` contains initialization and startup scripts that execute when the Docker containers are launched, handling necessary setup and configuration tasks.
   - Note: Service scripts in this directory require updates when modifying index template names to maintain system functionality
- `configurationFiles/` houses essential configuration files for Elasticsearch mappings, Arranger configs, and optional nginx server configurations for production deployments
   - For more information on these configuration files see our docs on [index mappings](https://docs.overture.bio/guides/administration-guides/index-mappings) and [customizing the data portal](https://docs.overture.bio/guides/administration-guides/customizing-the-data-portal) 
- `csv-processor/` A relatively ligthwieght command-line tool for processing and uploading CSV files into Elasticsearch. It has basic data validation, error handling and submitter metadata automation to help facilitate data submission for this proof of concept setup.
- `sampleData/` provides test datasets and example files for development, testing, and demonstration purposes
- `stage/` contains the front-end application code, including React components, styles, and UI logic
   - Note working on this has highlighted a gap in our docs on editing and customizing stage (the front-end UI), it is essentially just a react based single page app however I will work in the new year on updating our docs with clarifications and guides on the repo structure and how to configure and work with it. 
- `volumes/` maintains persistent storage for Elasticsearch data, ensuring data persistence between container restarts
- `Makefile` and `make.bat` provide build and deployment automation for Unix and Windows systems respectively
- `docker-compose.yml` defines the multi-container Docker application configuration

## Running the portal

1. **Set Up Docker:** Install or update to Docker Desktop version 4.32.0 or higher. Visit [Docker's website](https://www.docker.com/products/docker-desktop/) for installation details.

> [!important]
> Allocate sufficient resources to Docker:
>   - Minimum CPU: `8 cores`
>   - Memory: `8 GB`
>   - Swap: `2 GB`
>   - Virtual disk: `64 GB`
>
> Adjust these in Docker Desktop settings under "Resources".

**2. Clone the repo branch**

```
git clone -b prelude https://github.com/overture-stack/conductor.git
```

**3. Build a Stage image from its dockerfile**

```
cd stage
docker build -t multi-stage:3.0 .
```

Any edits made to the stage folder can be built and deployed locally using this docker compose setup.

**4. Run one of the following commands from the root of the repository:**

| Environment | Unix/macOS | Windows |
|-------------|------------|---------|
| Overture Platform | `make platform` | `./make.bat platform` |

Following startup front end portal will be available at your `localhost:3000`

**You can also run any of the following helper commands:**

| Description | Unix/macOS | Windows | 
|-------------|------------|---------|
| Shuts down all containers | `make down` | `./make.bat down` | 
| Shuts down all containers & removes all persistent Elasticsearch volumes | `make clean` | `./make.bat clean` | 

# CSV to Elasticsearch Processor

A Node.js command-line tool made for the prelude architecture as a simple utility for processing and uploading CSV files into Elasticsearch.

## Features

- 📊 Efficient CSV parsing with support for various delimiters
- 🚀 Batch processing for optimal performance
- 📈 Real-time progress tracking with ETA
- 🔄 Configurable batch sizes
- ⚠️ Detailed error reporting
- 🔐 Elasticsearch authentication support
- 🔍 Target index validation
- 🧐 CSV Header Validation
  - Checks for duplicate headers
  - Validates header structure
  - Verifies headers match Elasticsearch index mapping

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Access to an Elasticsearch instance

## Installation

1. Navigate to the CSV-processor directory and install the dependencies:

```bash
npm install
```

2. Build the TypeScript code:

```bash
npm run build
```

3. Optionally, you can install the utility globally

```bash
npm install -g .
```

## Uploading our mock data set

The `sampleData` folder contains various sample data files for testing purposes. To upload the pre-configured mock datasets run the following commands.

```
csv-processor -f ./sampleData/compositions.csv -i composition-index -b 100
```

```
csv-processor -f ./sampleData/instruments.csv -i instrument-index -b 100
```

If not installed globally run the following from the `dist` directory within the `csv-processor` folder following the build.

```
 ./main.js -f ../../sampleData/compositions.csv -i composition-index -b
```

```
 ./main.js -f ../../sampleData/instruments.csv -i instrument-index -b
```

## General Usage

The basic command structure is:

```bash
node csv-processor.js -f <file-path> [options]
```

### Command Line Options

| Option | Description | Default |
|--------|-------------|---------|
| `-f, --file <path>` | CSV file path (required) | - |
| `--url <url>` | Elasticsearch URL | http://localhost:9200 |
| `-i, --index <name>` | Elasticsearch index name | correlation-index |
| `-u, --user <username>` | Elasticsearch username | elastic |
| `-p, --password <password>` | Elasticsearch password | myelasticpassword |
| `-b, --batch-size <size>` | Batch size for processing | 1000 |
| `-d, --delimiter <char>` | CSV delimiter | , |

### Examples

Basic usage with default settings:
```bash
node csv-processor.js -f data.csv
```

Custom Elasticsearch configuration:
```bash
node csv-processor.js -f data.csv --url http://localhost:9200 -i my-index -u elastic -p mypassword
```

Process a semicolon-delimited CSV with custom batch size:
```bash
node csv-processor.js -f data.csv -d ";" -b 100
```

## Expected Output

```
➜ csv-processor -f ./sampleData/instruments.csv -i instrument-index -b 50

=============================================
      CSV Processor Starting... 🚀
=============================================

✓ File './sampleData/instruments.csv' is valid and readable.

✓ Connection to Elasticsearch successful.

✓ 'instrument-index' exists and is valid.

✓ CSV header structure is valid.

✓ All headers validated against the index mapping

🧮 Calculating records to upload

📊 Total records to process: 100

🚀 Starting transfer to elasticsearch...

██████████████████████████████ 100.0% 100.00% | 100/100 | ⏱ 0h 0m 0s | 🏁 0h 0m 0s | ⚡211 rows/sec

✓ Processing complete!

Total records processed: 100
Total time: 0h 0m 0s

```

## Error Logging

The CSV-Processor has decently robust error handling

```
➜ csv-processor -f ./sampleData/mismatched_headers.csv -i instrument-index -b 50

=============================================
      CSV Processor Starting... 🚀
=============================================

✓ File './sampleData/mismatched_headers.csv' is valid and readable.

✓ Connection to Elasticsearch successful.

✓ 'instrument-index' exists and is valid.

✓ CSV header structure is valid.


❌ Header/Field Mismatch Detected:

CSV headers:

✗ instrument_id
✓ instrument_name
✓ origin_country
✓ instrument_type
✓ historical_significance
✓ average_price
✓ primary_materials
✓ complexity_rating
✗ famous_musicians
✓ unique_characteristics

Unexpected headers in CSV:

✗ instrument_id
✗ famous_musicians
```

