# Drug Discovery Project

This repository contains the data and infrastructure for the Overture-Drug Discovery Data Portal.

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
git clone https://github.com/oicr-softeng/drug_discovery-ui.git
```

**3. Build a Stage image from its dockerfile**

```
cd stage
docker build -t multi-arranger-stage:2.0 .
```

**4. Run one of the following commands from the root of the repository:**

| Environment | Unix/macOS | Windows |
|-------------|------------|---------|
| Overture Platform | `make platform` | `./make.bat platform` |

Following startup front end portal will be available at your `localhost:3000`

**3. You can also run any of the following helper commands:**

| Description | Unix/macOS | Windows | 
|-------------|------------|---------|
| Shuts down all containers | `make down` | `./make.bat down` | 
| Removes all persistent Elasticsearch volumes | `make clean` | `./make.bat clean` | 

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

1. Clone the repository:
```bash
git clone [repository-url]
cd csv-processor
```

2. Install dependencies:
```bash
npm install
```

3. Build the TypeScript code:
```bash
npm run build
```

## Required Dependencies

```json
{
  "dependencies": {
    "@elastic/elasticsearch": "^7.17.14",
    "@types/chalk": "^0.4.31",
    "@types/node": "^22.9.3",
    "chalk": "^4.1.2",
    "commander": "^12.1.0",
    "csv-parse": "^5.6.0",
    "ts-node": "^10.9.2"
  },
  "devDependencies": {
    "typescript": "^5.7.2"
  }
}
```

## Usage

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

## Repo Structure

```
src/
├── types/
│   └── index.ts           # Type definitions (Record, SubmissionMetadata interfaces)
├── utils/
│   ├── cli.ts            # CLI setup and configuration
│   ├── elasticsearch.ts   # Elasticsearch client and operations
│   ├── formatting.ts      # Progress bar, duration formatting, etc.
│   └── csv.ts            # CSV parsing and processing utilities
├── services/
│   ├── processor.ts      # Main CSV to Doc processing logic
│   └── validator.ts      # Config, index and data validation and checking
└── main.ts               # Entry point, brings everything together
```

## Processing Flow

1. The tool first counts total records in the CSV file
2. Confirms headers with the user
3. Processes records in configured batch sizes
4. Sends batches to Elasticsearch using the bulk API
5. Displays real-time progress with:
   - Visual progress bar
   - Completion percentage
   - Records processed
   - Elapsed time
   - Estimated time remaining
   - Processing rate

## Error Handling

- Failed records are tracked and reported
- Detailed error logging for debugging
- Bulk processing continues even if individual records fail
- Summary of failed records provided at completion

## Output Format

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

## Performance Considerations

- Adjust batch size based on record size and Elasticsearch performance
- Larger batch sizes generally improve throughput but use more memory
- Monitor Elasticsearch CPU and memory usage
- Consider network latency when setting batch sizes

## Troubleshooting

Common issues and solutions:

1. **Connection Errors**
   - Verify Elasticsearch is running
   - Check URL and port
   - Confirm network connectivity

2. **Authentication Failures**
   - Verify username and password
   - Check user permissions

3. **Parse Errors**
   - Verify CSV format
   - Check delimiter setting
   - Inspect file encoding

4. **Memory Issues**
   - Reduce batch size
   - Ensure sufficient system resources
   - Monitor Node.js memory usage
