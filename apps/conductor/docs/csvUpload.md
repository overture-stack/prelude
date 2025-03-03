# CSV Upload to Elasticsearch

## Overview

The CSV Upload feature provides a command-line interface for processing and uploading CSV data to Elasticsearch. It handles parsing, validation, transformation, and bulk indexing of CSV files with error handling and progress reporting.

## Key Features

- Parse and validate CSV files with customizable delimiters
- Upload data to Elasticsearch with configurable batch sizes
- Automatic field-type detection and mapping
- Detailed progress reporting and error logging
- Concurrent file processing for improved performance
- Configurable retry mechanism for resilient uploads

## Command-Line Usage

```bash
conductor upload --files <file1.csv> [<file2.csv> ...] [options]
```

### Required Parameters

- `--files, -f`: One or more CSV files to process and upload

### Optional Parameters

- `--delimiter, -d`: CSV field delimiter (default: ",")
- `--batch-size, -b`: Number of records to send in each batch (default: 1000)
- `--index, -i`: Elasticsearch index name (default: from config)
- `--url, -u`: Elasticsearch URL (default: from config or localhost:9200)
- `--username`: Elasticsearch username (default: elastic)
- `--password`: Elasticsearch password (default: myelasticpassword)
- `--force`: Skip confirmation prompts (default: false)
- `--output, -o`: Output directory for results
- `--debug`: Enable debug logging

## Architecture

The CSV Upload feature follows a modular architecture with clear separation of concerns:

### Command Layer

The `UploadCommand` class extends the abstract `Command` base class and orchestrates the upload process. It:

1. Validates input files and settings
2. Sets up the Elasticsearch client
3. Processes each file through the CSV processor
4. Aggregates results and handles errors
5. Reports success or failure

### Service Layer

The feature uses specialized service modules:

- `services/elasticsearch/`: Provides functions for Elasticsearch operations
- `services/csvProcessor/`: Handles CSV parsing and transformation
- `validations/`: Contains validation functions for various inputs

### File Processing Flow

1. **Validation Phase**: Files and settings are validated
2. **Connection Phase**: Elasticsearch connection is established and validated
3. **Processing Phase**: Each file is processed in sequence
4. **Reporting Phase**: Results are aggregated and reported

## Code Walkthrough

### Command Structure

```typescript
export class UploadCommand extends Command {
  constructor() {
    super("upload");
    this.defaultOutputFileName = "upload-results.json";
  }

  protected async execute(cliOutput: CLIOutput): Promise<CommandResult> {
    // Command implementation
  }
}
```

### File Processing Loop

The command processes each file individually:

```typescript
for (const filePath of filePaths) {
  Logger.debug(`Processing File: ${filePath}`);

  try {
    await this.processFile(filePath, config);
    Logger.debug(`Successfully processed ${filePath}`);
    successCount++;
  } catch (error) {
    failureCount++;
    // Error handling logic
  }
}
```

### CSV Header Validation

The command performs basic validation of CSV headers:

```typescript
private async validateCSVHeaders(filePath: string, delimiter: string): Promise<boolean> {
  const fileContent = fs.readFileSync(filePath, "utf-8");
  const [headerLine] = fileContent.split("\n");

  if (!headerLine) {
    throw new ConductorError("CSV file is empty or has no headers", ErrorCodes.INVALID_FILE);
  }

  const parseResult = parseCSVLine(headerLine, delimiter, true);
  // Additional validation logic
}
```

### CSV Processing Service

The actual CSV processing is handled by a dedicated service:

```typescript
// In services/csvProcessor/index.ts
export async function processCSVFile(
  filePath: string,
  config: Config,
  client: Client
): Promise<ProcessingResult> {
  // Initialize processor
  const processor = new CSVProcessor(config, client);

  // Process the file
  return await processor.processFile(filePath);
}
```

### Batch Processing

Records are processed in batches for efficient uploading:

```typescript
// In services/csvProcessor/processor.ts
private async processBatch(batch: Record<string, any>[]): Promise<void> {
  if (batch.length === 0) return;

  this.currentBatch++;
  const batchNumber = this.currentBatch;

  try {
    await sendBatchToElasticsearch(
      this.client,
      batch,
      this.config.elasticsearch.index,
      (failureCount) => this.handleFailures(failureCount, batchNumber)
    );

    this.processedRecords += batch.length;
    this.updateProgress();
  } catch (error) {
    // Error handling
  }
}
```

### Elasticsearch Bulk Operations

The upload leverages Elasticsearch's bulk API for efficient indexing:

```typescript
// In services/elasticsearch/bulk.ts
export async function sendBulkWriteRequest(
  client: Client,
  records: object[],
  indexName: string,
  onFailure: (count: number) => void,
  options: BulkOptions = {}
): Promise<void> {
  // Retry logic and bulk request implementation
  const body = records.flatMap((doc) => [
    { index: { _index: indexName } },
    doc,
  ]);

  const { body: result } = await client.bulk({
    body,
    refresh: true,
  });

  // Process results and handle errors
}
```

## Error Handling

The upload feature implements multi-level error handling:

1. **Command-Level Errors**: General validation and processing errors
2. **File-Level Errors**: Issues with specific files
3. **Batch-Level Errors**: Problems with specific batches of records
4. **Record-Level Errors**: Individual record validation or indexing failures

All errors are logged and properly aggregated in the final result.

## Performance Considerations

The upload process is optimized for performance:

1. **Batch Processing**: Records are sent in configurable batches
2. **Streaming Parser**: CSV files are streamed rather than loaded entirely into memory
3. **Retry Mechanism**: Failed batches are retried with exponential backoff
4. **Progress Reporting**: Real-time progress is reported for large files

## Data Transformation

The processor can transform CSV data before indexing:

1. **Type Detection**: Automatically detects field types
2. **Date Parsing**: Converts date strings to proper date objects
3. **Nested Fields**: Supports dot notation for nested objects
4. **Numeric Conversion**: Converts numeric strings to actual numbers

## Extending the Feature

To extend this feature:

1. **Add New Validations**: Create additional validators in the `validations/` directory
2. **Enhance Transformations**: Modify the `transformRecord` function in the CSV processor
3. **Add CLI Options**: Update `configureCommandOptions` in `cli/options.ts`
4. **Support New File Formats**: Create new processor implementations for different formats

## Best Practices

When working with this code:

1. **Stream Large Files**: Avoid loading entire files into memory
2. **Validate Early**: Perform validation before processing
3. **Handle Partial Failures**: Allow some records to fail without aborting the entire batch
4. **Use Appropriate Batch Sizes**: Adjust batch size based on record complexity
5. **Monitor Memory Usage**: Watch for memory leaks when processing large files

## Testing

For testing the feature:

```bash
# Upload a single file
conductor upload -f ./data/sample.csv

# Upload multiple files with custom settings
conductor upload -f ./data/file1.csv ./data/file2.csv -d ";" -b 500 -i my-index

# Debug mode with custom credentials
conductor upload -f ./data/sample.csv --debug --username admin --password secret
```

## Troubleshooting

Common issues and solutions:

1. **CSV Parsing Errors**: Check delimiter settings and file encoding
2. **Elasticsearch Connection Issues**: Verify URL and credentials
3. **Mapping Errors**: Ensure index mapping is compatible with CSV data types
4. **Memory Limitations**: Reduce batch size for large records
5. **Performance Issues**: Increase batch size for simple records
