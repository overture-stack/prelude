# Conductor: CSV-to-Elasticsearch ETL processing

This command-line tool processes CSV files and uploads their data to an Elasticsearch index. It was designed to handle large CSV files by reading them line-by-line, validating and enriching each record, batching the records, and sending them to Elasticsearch for indexing. The tool provides detailed progress updates, error handling, and performance metrics.

## Features

- **File Validation:** Ensures that the CSV file exists, is readable, and is not empty.
- **CSV Header Validation:** Checks the header row for duplicates, invalid characters, and compliance with the index mapping being uploaded to.
- **Batch Processing:** Processes records in configurable batches for optimal performance.
- **Elasticsearch Upload:** Connects to an Elasticsearch instance and uploads data in bulk.
- **Real-Time Progress Reporting:** Displays a progress bar, estimated time remaining (ETA), and rows processed per second.

## Installation

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Build the project:**

   ```bash
   npm run build
   ```

3. **Install globally (optional):**

   ```bash
   npm install -g .
   ```

## Usage

This tool operates in **upload** mode only.

### Command Line Options

```bash
Usage: conductor [options]

Options:
  -f, --files <paths...>      Input CSV file paths (space separated) [required]
  -i, --index <name>          Elasticsearch index name (default: tabular-index)
  --url <url>                 Elasticsearch URL (default: http://localhost:9200)
  -u, --user <username>       Elasticsearch username (default: elastic)
  -p, --password <password>   Elasticsearch password (default: myelasticpassword)
  -b, --batch-size <size>     Batch size for processing (default: 1000)
  --delimiter <char>          CSV delimiter (default: ,)
  -h, --help                  Display help for command
```

### Examples

#### Upload a Single CSV File

```bash
conductor -f ./data/tabularData/clinical_data.csv --index tabular-index --url http://localhost:9200 -u elastic -p myelasticpassword -b 500
```

#### Upload Multiple CSV Files

```bash
conductor --files ./data/file1.csv ./data/file2.csv --index my-index
```

## Configuration

The tool uses a configuration object (`Config`) that includes:

- **elasticsearch:**
  - `url`: URL of your Elasticsearch instance.
  - `index`: Target Elasticsearch index.
  - `user`: Elasticsearch username.
  - `password`: Elasticsearch password.
- **batchSize:** Number of records processed per batch.
- **delimiter:** Character used as the CSV delimiter.

These are set via the command-line options.
