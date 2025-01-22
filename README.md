# Prelude Early Release

Prelude is a tool that enables teams to incrementally build their data platform. By breaking down data portal development into phased steps, teams can systematically verify requirements and user workflows while minimizing technical overhead.

Development progresses through four distinct phases, each building upon the previous phase's foundation while introducing new capabilities.

This process enables teams to:

* Validate project requirements with hands-on testing
* Gain a clear understanding of user workflows and interactions
* Documented data management processes
* Define security and access control needs
* Build a solid foundation for production deployment planning

## Prelude Development Phases

| Phase | Description | Software Components |
|-------|-------------|----------------|
| **PhaseOne:** Data Exploration & Theming | Display your tabular data in a themable portal with our front-end and back-end search components. | CSV-processor, Elasticsearch, Arranger, Stage |
| **PhaseTwo:** Tabular Data Management & Validation | Implementation of tabular data submission, storage and validation. | All the above with Lyric, LyricDb (Postgres), Lectern and LecternDb (MongoDb) added |
| **PhaseThree:** File Data & Metadata Management | Implement back-end file management. | All the above with Song, Score, SongDb (Postgres) and Object Storage (Minio) |
| **PhaseFour:** Identity and Access management | Configure Keycloak to authenticate users and authorize what they have access too. | Empahsis on data access control planning and Keycloak configuration |


## Repository Structure

- `scripts/` contains initialization and startup scripts that execute when the Docker containers are launched, handling necessary setup and configuration tasks.
   - Note: Service scripts in this directory require updates when modifying index template names to maintain system functionality
- `configurationFiles/` houses essential configuration files for Elasticsearch mappings, Arranger configs, and optional nginx server configurations for production deployments
   - For more information on these configuration files see our docs on [index mappings](https://docs.overture.bio/guides/administration-guides/index-mappings) and [customizing the data portal](https://docs.overture.bio/guides/administration-guides/customizing-the-data-portal) 
- `csv-processor/` A command-line tool for processing and uploading CSV files into Elasticsearch. It has basic data validation, error handling and submitter metadata automation to help facilitate data submission for this proof of concept setup.
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
docker build -t stage .
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

