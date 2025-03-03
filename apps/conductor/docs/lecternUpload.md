# Lectern Schema Upload

## Overview

The Lectern Schema Upload feature provides a command-line interface for uploading data dictionary schemas to a Lectern server. It simplifies the process of managing and versioning data schemas across different environments, ensuring consistent data definitions.

## Key Features

- Upload JSON schemas to Lectern server
- Robust health check mechanism
- Multiple retry attempts for server connection
- Validate schema files before upload
- Comprehensive error handling
- Support for different Lectern server configurations
- Flexible authentication options

## Health Check Mechanism

The upload process includes a sophisticated health check:

- **Connection Attempts**: 10 retry attempts
- **Retry Delay**: 20 seconds between attempts
- **Timeout**: 10 seconds per attempt
- **Status Verification**:
  - Checks multiple status indicators
  - Supports various server response formats
  - Provides detailed connection failure information

## URL Handling

Intelligent URL normalization ensures compatibility:

- Strips trailing slashes
- Handles different endpoint variations
- Automatically appends `/dictionaries` if needed
- Supports multiple URL formats

## Command-Line Usage

```bash
conductor lecternUpload --schema-file <schema.json> [options]
```

### Required Parameters

- `--schema-file, -s`: Path to the JSON schema file to upload (required)

### Optional Parameters

- `--lectern-url, -u`: Lectern server URL (default: http://localhost:3031)
- `--auth-token, -t`: Authentication token for the Lectern server
- `--output, -o`: Output directory for response logs
- `--force`: Force overwrite of existing files
- `--debug`: Enable detailed debug logging

## Schema File Format

The schema file should be a valid JSON file that defines the data dictionary structure. Here's an example:

```json
{
  "name": "My Data Dictionary",
  "version": "1.0.0",
  "description": "Comprehensive data dictionary for project",
  "fields": [
    {
      "name": "patient_id",
      "type": "string",
      "description": "Unique identifier for patient"
    },
    {
      "name": "age",
      "type": "integer",
      "description": "Patient's age in years"
    }
  ]
}
```

## Error Handling Capabilities

Comprehensive error handling includes:

- **Schema Validation**:
  - JSON parsing errors
  - Schema structure validation
- **Connection Errors**:
  - Server unreachable
  - Authentication failures
  - Timeout handling
- **Upload Errors**:
  - Duplicate schema detection
  - Format validation
  - Detailed error reporting

### Error Scenario Examples

```
✗ Error Lectern Schema Upload Failed
   Type: BadRequest
   Possible reasons:
        - Schema might already exist
        - Invalid schema format
        - Duplicate upload attempt
```

## Architecture

### Command Layer

The `LecternUploadCommand` class handles the schema upload process:

1. Validates the schema file
2. Checks Lectern server health
3. Uploads the schema
4. Provides detailed logging and error reporting

### Service Layer

The `LecternService` manages interactions with the Lectern server:

- Normalizes server URLs
- Handles authentication
- Manages schema upload requests

## Configuration Options

### Environment Variables

- `LECTERN_URL`: Default Lectern server URL
- `LECTERN_AUTH_TOKEN`: Default authentication token
- `LECTERN_SCHEMA`: Default schema file path

## Example Usage

### Basic Upload

```bash
# Upload a schema to the default local Lectern server
conductor lecternUpload -s ./data/dictionary.json
```

### Custom Configuration

```bash
# Upload to a specific Lectern server with authentication
conductor lecternUpload \
  -s ./data/advanced-dictionary.json \
  -u https://lectern.example.com \
  -t my-secret-token \
  -o ./lectern-logs
```

## Troubleshooting

Common issues and solutions:

1. **Connection Failures**:

   - Verify Lectern server URL
   - Check server availability
   - Ensure network connectivity

2. **Authentication Errors**:

   - Verify authentication token
   - Check server authentication requirements

3. **Schema Validation Errors**:
   - Validate JSON syntax
   - Ensure schema meets Lectern's requirements
   - Check for missing or incorrect fields

## Extending the Feature

To extend this feature:

1. Add new validation logic in the upload command
2. Enhance error handling
3. Add support for more complex authentication methods
4. Implement additional pre-upload schema transformations

## Best Practices

- Always validate schema files before upload
- Use environment variables for sensitive information
- Implement logging for traceability
- Handle potential network and server errors gracefully

## Testing

```bash
# Basic schema upload
conductor lecternUpload -s schema.json

# Upload with debug logging
conductor lecternUpload -s schema.json --debug

# Specify custom Lectern server
conductor lecternUpload -s schema.json -u https://custom-lectern.org
```
