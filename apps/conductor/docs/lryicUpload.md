# Lyric Data Loading

## Overview

The Lyric Data Loading feature provides a command-line interface for submitting, validating, and committing data files to a Lyric service. It automates the entire data loading workflow by identifying valid files based on schema information from Lectern, handling the multi-step submission process, and providing robust error handling and retry mechanisms.

## Key Features

- Automatic schema-based file validation and renaming
- Complete data loading workflow (submit, validate, commit)
- Integration with Lectern for schema information
- Multiple retry attempts for validation status checks
- Comprehensive error handling and diagnostics
- Command-line and programmatic interfaces
- Flexible configuration through environment variables or command options

## Workflow Process

The data loading process includes several automated steps:

1. **Schema Discovery**: Automatically fetches dictionary and schema information from Lectern
2. **File Validation**: Finds and validates CSV files matching the schema name
3. **File Renaming**: Automatically renames files to match schema conventions if needed
4. **Data Submission**: Submits validated files to Lyric
5. **Validation Monitoring**: Polls the submission status until validation completes
6. **Commit Process**: Commits valid submissions to finalize the data loading

## Command-Line Usage

```bash
conductor lyricData [options]
```

### Required Parameters

- `--lyric-url, -u`: Lyric service URL (required or via LYRIC_URL environment variable)
- `--lectern-url, -l`: Lectern service URL (required or via LECTERN_URL environment variable)
- `--data-directory, -d`: Directory containing CSV data files (required or via LYRIC_DATA environment variable)

### Optional Parameters

- `--category-id, -c`: Category ID (default: "1")
- `--organization, -g`: Organization name (default: "OICR")
- `--max-retries, -m`: Maximum number of retry attempts (default: 10)
- `--retry-delay, -r`: Delay between retry attempts in milliseconds (default: 20000)
- `--output, -o`: Output directory for response logs
- `--force`: Force overwrite of existing files
- `--debug`: Enable detailed debug logging

## Environment Variables

All command parameters can be configured through environment variables:

- `LYRIC_URL`: Lyric service URL
- `LECTERN_URL`: Lectern service URL
- `LYRIC_DATA`: Directory containing CSV data files
- `CATEGORY_ID`: Category ID
- `ORGANIZATION`: Organization name
- `MAX_RETRIES`: Maximum number of retry attempts
- `RETRY_DELAY`: Delay between retry attempts in milliseconds

## File Naming Requirements

The Lyric data loading process requires CSV files to match the schema name from Lectern. The system will:

1. Use exact matches (e.g., `patient.csv` for schema name "patient")
2. Auto-rename files that start with the schema name (e.g., `patient_v1.csv` → `patient.csv`)
3. Skip files that don't match the schema naming pattern

## Error Handling Capabilities

Comprehensive error handling includes:

- **Schema Discovery Errors**:
  - Lectern connection failures
  - Missing or invalid dictionary or schema information
- **File Validation Errors**:
  - Missing data directory
  - No matching CSV files
  - Filename format issues
- **Submission Errors**:
  - Network connection problems
  - Service unavailability
  - Authentication failures
- **Validation Errors**:
  - Invalid data in CSV files
  - Schema validation failures
  - Timeout during validation wait

### Error Scenario Examples

```
✗ Error: Data Loading Failed
   Validation failed. Please check your data files for errors.
   Submission ID: 12345
   Status: INVALID

   You can check the submission details at: http://localhost:3030/submission/12345
```

## Architecture

### Command Layer

The `LyricUploadCommand` class handles the data loading process:

1. Validates the required parameters and environment
2. Sets up the Lyric data service
3. Coordinates the complete data loading workflow
4. Provides detailed error information and suggestions

### Service Layer

The `LyricDataService` manages all interactions with the Lyric and Lectern services:

- Fetches dictionary and schema information from Lectern
- Finds and validates files matching the schema name
- Submits data to Lyric
- Monitors validation status
- Commits validated submissions

## Example Usage

### Basic Data Loading

```bash
# Load data using environment variables
export LYRIC_URL=http://localhost:3030
export LECTERN_URL=http://localhost:3031
export LYRIC_DATA=/path/to/data
conductor lyricData
```

### Custom Configuration

```bash
# Load data with custom parameters
conductor lyricData \
  --lyric-url https://lyric.example.com \
  --lectern-url https://lectern.example.com \
  --data-directory ./data \
  --category-id 2 \
  --organization "My Organization" \
  --max-retries 15 \
  --retry-delay 30000 \
  --output ./logs
```

## Troubleshooting

Common issues and solutions:

1. **No Valid Files Found**:

   - Ensure CSV files match the schema name from Lectern
   - Check file extensions (must be .csv)
   - Verify file permissions and readability

2. **Validation Failures**:

   - Check CSV content against schema requirements
   - Examine validation error messages
   - Review submission details in the Lyric UI

3. **Connection Issues**:

   - Verify Lyric and Lectern service URLs
   - Check network connectivity
   - Ensure services are running and accessible

4. **Timeout During Validation**:
   - Increase the `--max-retries` value
   - Adjust the `--retry-delay` parameter
   - Check if the validation process is stuck in Lyric

## Best Practices

- Ensure CSV files follow the schema naming convention
- Validate CSV data before submission
- Use environment variables for consistent configuration
- Monitor the validation process in the Lyric UI
- Review logs for detailed information on each step
- Run with `--debug` for maximum visibility into the process

## Testing

```bash
# Basic data loading
conductor lyricData -u http://localhost:3030 -l http://localhost:3031 -d ./data

# With debug output for troubleshooting
conductor lyricData -u http://localhost:3030 -l http://localhost:3031 -d ./data --debug

# Custom organization and category
conductor lyricData -u http://localhost:3030 -l http://localhost:3031 -d ./data -c 2 -g "Research Team"
```

## Related Commands

- `lyricRegister`: Register a Lectern dictionary with Lyric
- `lecternUpload`: Upload a schema to Lectern
