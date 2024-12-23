# Prelude - Early Release

Rapid development and deployment of proof-of-concept portals.

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

A Node.js command-line tool for efficiently processing and indexing CSV files into Elasticsearch. This tool features progress tracking, batched processing, and detailed error reporting.

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

The tool provides colorized console output including:

```
Total records to process: 1000

📋 Processing Configuration:
├─ 📁 File: data.csv
├─ 🔍 Index: my-index
└─ 📝 Delimiter: ,

📑 Headers: id, name, value

🚀 Starting data processing and indexing...

[████████████░░░░░░░░░░] 50% | 500/1000 | ⏱ 0h 1m 30s | 🏁 1m 30s | ⚡1000 rows/sec
```
