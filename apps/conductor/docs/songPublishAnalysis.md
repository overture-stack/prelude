# SONG Publish Analysis

## Overview

The SONG Publish Analysis feature provides a streamlined command-line interface for publishing genomic analysis data within the Overture ecosystem. This critical final step in the data submission workflow makes analyses visible to downstream services like Maestro for indexing and discovery, enabling researchers to access the data through front-end portals.

## Key Features

- Publish analyses to make them discoverable
- Intelligent Docker client detection
- Dual implementation strategy (Docker or direct API)
- Multiple retry mechanisms for reliability
- Comprehensive error detection and reporting
- Support for ignoring undefined MD5 checksums
- Clear success and failure feedback
- Integration with both Song client and REST API endpoints

## Workflow Integration

The SONG Publish Analysis command represents the final step in the Overture data submission workflow:

1. **Metadata Submission**: Analysis metadata is submitted to SONG (`songSubmitAnalysis`)
2. **File Upload**: Data files are uploaded to Score (For now using the score client)
3. **Publication**: This command publishes the analysis making it available (`songPublishAnalysis`)

## Publication Process

When publishing an analysis, the command:

1. Validates that the analysis ID exists
2. Verifies that all files referenced in the analysis have been uploaded to Score
3. Changes the analysis state from UNPUBLISHED to PUBLISHED
4. Makes the analysis available for indexing by Maestro
5. Enables discovery through front-end portal interfaces

## Command-Line Usage

```bash
conductor songPublishAnalysis --analysis-id <analysisId> [options]
```

### Required Parameters

- `--analysis-id, -a`: Analysis ID to publish (required)

### Optional Parameters

- `--study-id, -i`: Study ID (default: "demo")
- `--song-url, -u`: SONG server URL (default: http://localhost:8080)
- `--auth-token, -t`: Authentication token (default: "123")
- `--ignore-undefined-md5`: Ignore files with undefined MD5 checksums
- `--debug`: Enable detailed debug logging

## Docker Integration

The command intelligently detects and utilizes the Song Docker container if available:

```bash
# Check if Docker and Song client container are running
docker ps | grep "song-client"

# Execute command using container if available
conductor songPublishAnalysis --analysis-id 4d9ed1c5-1053-4377-9ed1-c51053f3771f
```

## Success Response

Upon successful publication, you'll receive confirmation with the analysis details:

```
✓ Analysis published successfully

    - Analysis ID: 4d9ed1c5-1053-4377-9ed1-c51053f3771f
    - Study ID: demo

▸ Info SONG Analysis Publication command completed successfully in 0.82s
```

## Error Handling Capabilities

Comprehensive error detection and reporting includes:

- **Input Validation**:
  - Missing analysis ID
  - Invalid analysis ID format
  - Study ID validation
- **Publication Errors**:

  - Analysis not found
  - Files not uploaded to Score
  - Permission/authorization issues
  - MD5 checksum issues
  - Network connection failures

- **State Transition Errors**:
  - Invalid state transitions
  - Already published analyses
  - Suppressed analyses

### Error Response Examples

```
✗ Error [INVALID_ARGS]: Analysis ID not specified. Use --analysis-id or set ANALYSIS_ID environment variable.
✗ Error [CONNECTION_ERROR]: Failed to publish analysis: Analysis not found: 4d9ed1c5-xxxx-xxxx-xxxx-xxxxxxxxxxxx
✗ Error [CONNECTION_ERROR]: Publishing failed with status 401: Unauthorized
✗ Error [CONNECTION_ERROR]: Failed to publish analysis: Files not found in Score storage
```

## Architecture

### Command Layer

The `SongPublishAnalysisCommand` class orchestrates the publication process:

1. Analysis ID and parameter validation
2. Docker/environment detection for integration approach
3. Publication request through Song client or direct REST API
4. Response processing and error handling

### Integration Approaches

The command supports two integration approaches:

1. **Docker Client Execution**: Utilizing existing Song client container
2. **Direct API Integration**: Making REST API calls when containers aren't available

## Configuration Options

### Environment Variables

- `ANALYSIS_ID`: Default analysis ID
- `STUDY_ID`: Default study ID
- `SONG_URL`: Default SONG service URL
- `AUTH_TOKEN`: Default authentication token
- `IGNORE_UNDEFINED_MD5`: Default setting for ignoring undefined MD5 checksums

## Example Usage

### Basic Publication

```bash
# Publish an analysis
conductor songPublishAnalysis --analysis-id 4d9ed1c5-1053-4377-9ed1-c51053f3771f
```

### Advanced Configuration

```bash
# Publish with custom study and ignore MD5 issues
conductor songPublishAnalysis \
  --analysis-id 4d9ed1c5-1053-4377-9ed1-c51053f3771f \
  --study-id my-cancer-study \
  --song-url https://song.genomics-platform.org \
  --auth-token eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... \
  --ignore-undefined-md5
```

## Troubleshooting

Common issues and solutions:

1. **Publication Failures**:

   - Verify analysis ID exists and belongs to the correct study
   - Ensure all files have been properly uploaded to Score
   - Check MD5 checksums are defined (or use --ignore-undefined-md5)
   - Verify proper authorization token and permissions

2. **Authentication Issues**:

   - Check token format and validity
   - Ensure token has proper permissions
   - Verify token hasn't expired

3. **Integration Problems**:
   - Check Song service availability
   - Verify network connectivity
   - Ensure Docker container is configured correctly if using

## Complete Workflow Example

```bash
# Step 1: Submit metadata to Song
conductor songSubmitAnalysis --analysis-file SP059902.vcf.json
# Response: analysisId: 4d9ed1c5-1053-4377-9ed1-c51053f3771f

# Step 2: Generate manifest and upload files
docker exec song-client sh -c "sing manifest -a {AnalysisId} -f /output/manifest.txt -d /output/"
docker exec score-client sh -c "score-client  upload --manifest /output/manifest.txt"

# Step 3: Publish the analysis
conductor songPublishAnalysis --analysis-id 4d9ed1c5-1053-4377-9ed1-c51053f3771f
```

## Analysis State Management

The SONG Publish Analysis command transitions an analysis through specific states:

1. **UNPUBLISHED**: Initial state after submission
2. **PUBLISHED**: State after successful publication
3. **SUPPRESSED**: Special state for analyses no longer needed

Only analyses in the UNPUBLISHED state can be published. To unpublish an analysis that has been published, you would need to use the SONG API's unpublish endpoint.

## Best Practices

- Always upload all required files before publishing
- Use consistent study IDs across related commands
- Implement comprehensive logging for audit trails
- Follow a complete workflow from submission to publishing
- Consider using environment variables for consistent configuration

## Testing

```bash
# Basic publication
conductor songPublishAnalysis -a 4d9ed1c5-1053-4377-9ed1-c51053f3771f

# Debug mode for detailed logging
conductor songPublishAnalysis -a 4d9ed1c5-1053-4377-9ed1-c51053f3771f --debug

# Custom study ID
conductor songPublishAnalysis -a 4d9ed1c5-1053-4377-9ed1-c51053f3771f -i genomics-study-a
```

## Technical Details

### API Endpoints

When using the direct REST API approach, the command makes a PUT request to:

```
PUT /studies/{studyId}/analysis/publish/{id}
```

Optional query parameters:

- `ignoreUndefinedMd5=true` - When the --ignore-undefined-md5 flag is used

### Response Format

The expected response format from a successful publication:

```json
{
  "message": "AnalysisId 4d9ed1c5-1053-4377-9ed1-c51053f3771f successfully published"
}
```

### Publication Prerequisites

For an analysis to be successfully published:

1. The analysis must exist in SONG
2. All files referenced in the analysis must be uploaded to Score
3. The user must have publication permissions
4. The analysis must be in the UNPUBLISHED state
5. File checksums must match (unless ignoring undefined MD5)
