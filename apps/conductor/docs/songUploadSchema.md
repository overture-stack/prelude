# SONG Schema Upload

## Overview

The SONG Schema Upload feature provides a streamlined command-line interface for uploading analysis schemas to a SONG metadata server. This functionality facilitates standardized genomic data management by ensuring consistent schema definitions across environments, critical for bioinformatics and genomic data processing pipelines.

## Key Features

- Upload JSON schemas to SONG metadata service
- Intelligent endpoint management
- Proactive health verification
- Automatic retry mechanism
- Schema validation before transmission
- Robust error handling and reporting
- Flexible authentication support
- Detailed success and error feedback

## Health Check Mechanism

Each upload operation includes a comprehensive health verification:

- **Connection Status**: Verifies SONG service availability
- **Endpoint Health**: Checks `/isAlive` endpoint for service status
- **Timeout Control**: 10 second timeout for health verification
- **Response Validation**: Ensures proper service response codes
- **Connection Troubleshooting**: Provides actionable feedback for connection issues

## URL Intelligence

Sophisticated URL handling ensures proper endpoint targeting:

- Automatically normalizes URLs to standardized format
- Ensures `/schemas` endpoint is correctly specified
- Handles various URL formats gracefully
- Removes redundant path elements
- Supports both path and query parameter specifications

## Command-Line Usage

```bash
conductor songUploadSchema --schema-file <schema.json> [options]
```

### Required Parameters

- `--schema-file, -s`: Path to the JSON schema file to upload (required)

### Optional Parameters

- `--song-url, -u`: SONG server URL (default: http://localhost:8080)
- `--auth-token, -t`: Authentication token (default: "123")
- `--output, -o`: Output directory for upload response logs
- `--force`: Force overwrite of existing output files
- `--debug`: Enable detailed debug logging

## Schema File Format

The schema file should be a valid JSON document following the SONG schema structure. Here's an example:

```json
{
  "name": "genomic_variant_analysis",
  "schema": {
    "type": "object",
    "required": ["sample_id", "analysis_type"],
    "properties": {
      "sample_id": {
        "type": "string",
        "description": "Unique identifier for the sample"
      },
      "analysis_type": {
        "type": "string",
        "enum": ["somatic", "germline"],
        "description": "Type of genomic analysis performed"
      },
      "experimental_strategy": {
        "type": "string",
        "description": "Experimental strategy used"
      }
    }
  },
  "options": {
    "fileTypes": ["bam", "cram", "vcf"],
    "externalValidations": [
      {
        "url": "http://example.com/{study}/sample/{value}",
        "jsonPath": "sample_id"
      }
    ]
  }
}
```

## Success Response

Upon successful schema upload, you'll receive confirmation with the schema details:

```
✓ Success Schema uploaded successfully

    - Schema Name: genomic_variant_analysis
    - Schema Version: 1.0

▸ Info SONG Schema Upload command completed successfully in 0.78s
```

## Error Handling Capabilities

Comprehensive error detection and reporting includes:

- **Schema Validation**:
  - JSON syntax verification
  - Format compliance validation
  - Structure integrity checks
  - Required field verification (`name` and `schema`)
- **Communication Errors**:
  - Connection failures
  - Authentication issues
  - Timeout handling
  - HTTP status code validation
- **Server-side Issues**:
  - API rejection handling
  - Schema conflict detection
  - Detailed error response parsing

### Error Response Examples

```
✗ Error [CONNECTION_ERROR]: SONG schema upload error: Invalid schema format
✗ Error [CONNECTION_ERROR]: Unable to establish connection with SONG service
✗ Error [INVALID_FILE]: Schema file contains invalid JSON: Unexpected token at line 12
✗ Error [INVALID_FILE]: Invalid schema: Missing required field 'name'
```

## Architecture

### Command Layer

The `SongUploadSchemaCommand` class orchestrates the schema upload process:

1. Schema file validation and parsing
2. SONG service health verification
3. Schema transmission and response handling
4. Comprehensive logging and error management

### Service Integration

The command integrates directly with the SONG API:

- Normalizes endpoint URLs
- Manages authentication headers
- Implements retry logic for resilience
- Provides structured response handling

## Configuration Options

### Environment Variables

- `SONG_URL`: Default SONG service URL
- `SONG_SCHEMA`: Default schema file location
- `SONG_AUTH_TOKEN`: Default authentication token

## Example Usage

### Basic Upload

```bash
# Upload a schema to a local SONG service
conductor songUploadSchema -s ./schemas/variant-analysis.json
```

### Advanced Configuration

```bash
# Upload to a remote SONG service with authentication
conductor songUploadSchema \
  -s ./schemas/sequencing-experiment.json \
  -u https://song.genomics-platform.org \
  -t bearer_eyJhbGc... \
  -o ./upload-logs \
  --debug
```

## Troubleshooting

Common issues and solutions:

1. **Connection Issues**:

   - Verify SONG service URL is correct and accessible
   - Check network connectivity and firewall settings
   - Ensure service is running and healthy

2. **Authentication Problems**:

   - Verify authentication token format and validity
   - Check token permissions and expiration
   - Ensure proper authorization for schema uploads

3. **Schema Rejection**:
   - Validate JSON syntax with a linter
   - Check for required fields (`name` and `schema`)
   - Verify compliance with SONG schema requirements:
     - Ensure `schema` is a valid JSON Schema object
     - Check that `options.fileTypes` is an array of strings if present
     - Verify that `options.externalValidations` has valid URLs and jsonPaths if present
   - Look for potential conflicts with existing schemas

## Schema Structure Requirements

For a schema to be valid, it must include:

1. A `name` field (string)
2. A `schema` field (object) that follows JSON Schema structure
3. Optional `options` object that may include:
   - `fileTypes`: Array of allowed file extensions
   - `externalValidations`: Array of validation objects with `url` and `jsonPath` properties

## Best Practices

- Validate schemas locally before upload
- Use environment variables for consistent configuration
- Implement comprehensive logging for audit trails
- Store schemas in version control
- Follow schema versioning conventions
- Document schema changes thoroughly

## Testing

```bash
# Basic schema upload
conductor songUploadSchema -s analysis-schema.json

# Debug mode for detailed logging
conductor songUploadSchema -s analysis-schema.json --debug

# Specify custom SONG server
conductor songUploadSchema -s analysis-schema.json -u https://song-api.genomics.org
```
