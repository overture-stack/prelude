# SONG Analysis Submission

## Overview

The SONG Analysis Submission feature provides a robust command-line interface for submitting genomic analysis metadata to a SONG server. This functionality is essential in genomic data workflows, allowing users to register analysis metadata before uploading the corresponding data files, maintaining data provenance and supporting reproducible science.

## Key Features

- Submit analysis metadata to SONG metadata service
- Support for complex, nested analysis JSON structures
- Intelligent health verification before operations
- Automatic retry mechanism with configurable attempts
- Duplicate detection with optional override
- Robust error handling and reporting
- Flexible authentication support
- Environment variable integration
- Detailed operation feedback with analysis ID extraction

## Health Check Mechanism

Each submission includes comprehensive health verification:

- **Connection Status**: Verifies SONG service availability
- **Endpoint Health**: Checks `/isAlive` endpoint for service readiness
- **Timeout Control**: 20 second timeout for health verification
- **Response Validation**: Ensures proper service response codes
- **Connection Troubleshooting**: Provides actionable feedback for connection issues

## Command-Line Usage

```bash
conductor songSubmitAnalysis --analysis-file <analysis.json> [options]
```

### Required Parameters

- `--analysis-file, -a`: Path to the analysis JSON file to submit (required)
- `--song-url, -u`: SONG server URL (required, or set via SONG_URL environment variable)

### Optional Parameters

- `--study-id, -i`: Study ID (default: "demo")
- `--allow-duplicates`: Allow duplicate analysis submissions (default: false)
- `--auth-token, -t`: Authentication token (default: "123")
- `--output, -o`: Output directory for response logs
- `--force`: Force studyId from command line instead of from file
- `--debug`: Enable detailed debug logging

## Analysis File Structure

The analysis file should contain a valid SONG analysis JSON document. Example:

```json
{
  "studyId": "demo",
  "analysisType": {
    "name": "sampleSchema"
  },
  "files": [
    {
      "dataType": "Raw SV Calls",
      "fileName": "sample.vcf.gz",
      "fileSize": 17246,
      "fileMd5sum": "94b790078d8e98ad08ffc42389e2fa68",
      "fileAccess": "open",
      "fileType": "VCF",
      "info": {
        "dataCategory": "Simple Nucleotide Variation"
      }
    }
  ],
  "workflow": {
    "workflowName": "Variant Calling",
    "workflowVersion": "1.0.0",
    "runId": "run123",
    "sessionId": "session456"
  },
  "experiment": {
    "platform": "Illumina",
    "experimentalStrategy": "WGS",
    "sequencingCenter": "Sequencing Center"
  }
}
```

## Success Response

Upon successful analysis submission, you'll receive confirmation with the analysis details:

```
✓ Success Analysis submitted successfully

    - Analysis ID: 84f02a6c-e477-4078-9b70-2f398d16e8c4
    - Study ID: demo
    - Analysis Type: sampleSchema

▸ Info SONG Analysis Submission command completed successfully in 0.85s
```

## Error Handling Capabilities

Comprehensive error detection and reporting includes:

- **Validation Errors**:
  - Required parameter verification
  - JSON syntax validation
  - Analysis structure validation
  - Required fields verification
- **Communication Errors**:
  - Connection failures
  - Authentication issues
  - Timeout handling
  - HTTP status code validation
- **Server-side Issues**:
  - API rejection handling
  - Duplicate analysis detection
  - Study not found handling
  - Detailed error response parsing

### Error Response Examples

```
✗ Error [CONNECTION_ERROR]: Unable to establish connection with SONG service
✗ Error [INVALID_ARGS]: Analysis file not specified. Use --analysis-file or set ANALYSIS_FILE environment variable.
✗ Error [INVALID_FILE]: Analysis file contains invalid JSON: Unexpected token at line 12
```

## Duplicate Analysis Handling

When attempting to submit an analysis that already exists:

1. **Without `--allow-duplicates` flag**: Command will detect the existing analysis and report an error
2. **With `--allow-duplicates` flag**: Command will proceed with submission attempt

```
⚠ Warn Submission already exists, but --allow-duplicates was specified
```

## Study ID Handling

The command supports two ways to specify the study ID:

1. **From analysis file**: By default, the command uses the `studyId` field in the analysis file
2. **From command line**: Using the `--study-id` parameter (override with `--force` flag)

If the study ID in the file differs from the command line, a warning is displayed:

```
⚠ Warn StudyId in file (study123) differs from provided studyId (demo)
```

## Architecture

### Command Layer

The `SongSubmitAnalysisCommand` class orchestrates the analysis submission process:

1. Parameter validation
2. SONG service health verification
3. Analysis file validation and parsing
4. Analysis submission to SONG server
5. Response handling and analysis ID extraction

### Service Integration

The command integrates directly with the SONG API:

- Normalizes endpoint URLs
- Manages authentication headers
- Implements retry logic for resilience
- Handles duplicate detection
- Extracts analysis ID from response

## Configuration Options

### Environment Variables

- `SONG_URL`: Default SONG service URL
- `ANALYSIS_FILE`: Default analysis file path
- `STUDY_ID`: Default study ID
- `AUTH_TOKEN`: Default authentication token
- `ALLOW_DUPLICATES`: Whether to allow duplicate submissions (true/false)

## Example Usage

### Basic Submission

```bash
# Submit an analysis with minimal configuration
conductor songSubmitAnalysis -a ./analysis.json -u http://localhost:8080
```

### Complex Configuration

```bash
# Submit with detailed configuration
conductor songSubmitAnalysis \
  --analysis-file ./analysis.json \
  --song-url https://song.genomics-platform.org \
  --study-id my-project-2023 \
  --auth-token "bearer_eyJhbGc..." \
  --allow-duplicates \
  --force \
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
   - Ensure proper authorization for analysis submission

3. **Submission Rejection**:
   - Check if analysis already exists (use `--allow-duplicates` if needed)
   - Verify study exists (create with `songCreateStudy` command)
   - Check analysis format against the expected schema
   - Validate all required fields are present

## Integration with SONG Workflow

The typical SONG metadata workflow follows these steps:

1. Create Study (using `songCreateStudy`)
2. Upload Schema (using `songUploadSchema`) if needed
3. **Submit Analysis** (using `songSubmitAnalysis`)
4. Upload files referenced in the analysis
5. Publish analysis to make it publicly available

Submitting analysis is a crucial step in this workflow, enabling proper tracking of genomic data files.

## Best Practices

- Validate analysis JSON locally before submission
- Ensure study is created before submitting analysis
- Include accurate file sizes and MD5sums in analysis
- Use meaningful, consistent nomenclature
- Set up environment variables for consistent configuration
- Store analysis JSON files in version control
- Automate submissions in data processing pipelines
- Use `--debug` for troubleshooting

## Notes on File Upload

The SONG Analysis Submission command registers the metadata for your analysis, but does not upload the actual data files. After successfully submitting your analysis metadata and receiving an analysis ID, you'll need to use a separate file upload command to transfer the genomic data files to storage.
