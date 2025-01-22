# PhaseOne

![Image Title](/docs/images/phaseOne.png 'PhaseOne Architecture Diagram')

## CSV to Elasticsearch Processor

The CSV to Elasticsearch Processor is a Node.js command-line tool designed for
the phaseOne prelude architecture. It provides a streamlined solution for
processing and uploading CSV files into Elasticsearch, with validation and error
handling capabilities.

#### Key Features

- Efficient CSV parsing with support for multiple delimiter types
- Batch processing for optimized performance
- Real-time progress tracking with ETA
- Configurable batch sizes for processing
- Comprehensive error reporting
- Elasticsearch authentication support
- Index validation before processing
- CSV header validation including:
  - Duplicate header detection
  - Header structure validation
  - Elasticsearch mapping compatibility checks

#### System Requirements

Before installation, ensure your system meets these prerequisites:

- Node.js version 14 or higher
- npm or yarn package manager

#### Installation Guide

1. Install Dependencies:

```bash
npm install
```

2. Build from TypeScript:

```bash
npm run build
```

3. Optional: Install Globally:

```bash
npm install -g .
```

#### Basic Usage

###### Command Structure

```bash
node csv-processor.js -f <file-path> [options]
```

###### Available Options

| Option                      | Description               | Default Value         |
| --------------------------- | ------------------------- | --------------------- |
| `-f, --file <path>`         | CSV file path (required)  | -                     |
| `--url <url>`               | Elasticsearch URL         | http://localhost:9200 |
| `-i, --index <name>`        | Elasticsearch index name  | correlation-index     |
| `-u, --user <username>`     | Elasticsearch username    | elastic               |
| `-p, --password <password>` | Elasticsearch password    | myelasticpassword     |
| `-b, --batch-size <size>`   | Batch size for processing | 1000                  |
| `-d, --delimiter <char>`    | CSV delimiter             | ,                     |

#### Usage Examples

###### Basic Usage

Process a CSV file with default settings:

```bash
node csv-processor.js -f data.csv
```

###### Custom Elasticsearch Configuration

Process with specific Elasticsearch settings:

```bash
node csv-processor.js -f data.csv --url http://localhost:9200 -i my-index -u elastic -p mypassword
```

###### Custom Delimiter and Batch Size

Process a semicolon-delimited CSV with smaller batches:

```bash
node csv-processor.js -f data.csv -d ";" -b 100
```

#### Processing Sample Data

The tool includes sample datasets for testing. To process these:

1. For Demos Data:

```bash
csv-processor -f ./sampleData/demos.csv -i demo-index -b 100
```

2. For Instruments Data:

```bash
csv-processor -f ./sampleData/instruments.csv -i instrument-index -b 100
```

Note: If not installed globally, run from the `dist` directory:

```bash
./main.js -f ../../sampleData/demos.csv -i demo-index -b
./main.js -f ../../sampleData/instruments.csv -i instrument-index -b
```

#### Understanding Output

###### Successful Processing

When processing succeeds, you'll see output similar to:

```
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

██████████████████████████████ 100.0% | 100/100 | ⏱ 0h 0m 0s | 🏁 0h 0m 0s | ⚡211 rows/sec

✓ Processing complete!
```

###### Error Handling

The processor provides detailed error feedback. For example, when headers don't
match:

```
❌ Header/Field Mismatch Detected:

CSV headers:
✗ instrument_id
✓ instrument_name
✓ origin_country
[...]

Unexpected headers in CSV:
✗ instrument_id
✗ famous_musicians
```

#### Troubleshooting

Common issues and solutions:

1. **Header Mismatches**: Ensure CSV headers exactly match your Elasticsearch
   mapping
2. **Connection Errors**: Verify Elasticsearch URL and credentials
3. **Performance Issues**: Adjust batch size for optimal performance
4. **File Access Errors**: Check file permissions and path

#### Best Practices

1. Always validate your CSV structure before processing large files
2. Use appropriate batch sizes based on your data volume
3. Monitor system resources during large uploads
4. Keep regular backups of your data
5. Test with sample data before processing production datasets

For additional support or detailed information, refer to the project repository
or contact the development team.
