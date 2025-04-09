# SONG Create Study

## Overview

The SONG Create Study feature provides a streamlined command-line interface for creating and registering studies in a SONG metadata server. This functionality enables users to initialize study environments for genomic data submissions, a necessary prerequisite for uploading analyses and data to SONG-enabled genomic data management systems.

## Key Features

- Create new studies in SONG metadata service
- Intelligent health verification before operations
- Automatic retry mechanism with configurable attempts
- Conflict detection for existing studies
- Robust error handling and reporting
- Flexible authentication support
- Environment variable integration
- Detailed operation feedback

## Health Check Mechanism

Each create operation includes comprehensive health verification:

- **Connection Status**: Verifies SONG service availability
- **Endpoint Health**: Checks `/isAlive` endpoint for service readiness
- **Timeout Control**: 10 second timeout for health verification
- **Response Validation**: Ensures proper service response codes
- **Connection Troubleshooting**: Provides actionable feedback for connection issues

## Command-Line Usage

```bash
conductor songCreateStudy [options]
```

### Required Parameters

- `--song-url, -u`: SONG server URL (required, or set via SONG_URL environment variable)

### Optional Parameters

- `--study-id, -i`: Study ID (default: "demo")
- `--study-name, -n`: Study name (default: "string")
- `--organization, -g`: Organization name (default: "string")
- `--description, -d`: Study description (default: "string")
- `--auth-token, -t`: Authentication token (default: "123")
- `--output, -o`: Output directory for response logs
- `--force`: Force creation even if study already exists
- `--debug`: Enable detailed debug logging

## Success Response

Upon successful study creation, you'll receive confirmation with the study details:

```
✓ Success Study created successfully

    - Study ID: my-study-123
    - Study Name: My Genomic Study
    - Organization: Research Organization

▸ Info SONG Study Creation command completed successfully in 0.65s
```

## Error Handling Capabilities

Comprehensive error detection and reporting includes:

- **Validation Errors**:
  - Required parameter verification
  - Format validation
- **Communication Errors**:
  - Connection failures
  - Authentication issues
  - Timeout handling
  - HTTP status code validation
- **Server-side Issues**:
  - API rejection handling
  - Study conflict detection
  - Detailed error response parsing

### Error Response Examples

```
✗ Error [CONNECTION_ERROR]: Unable to establish connection with SONG service
✗ Error [INVALID_ARGS]: SONG URL not specified. Use --song-url or set SONG_URL environment variable.
```

## Study Already Exists

When attempting to create a study that already exists:

1. **Without `--force` flag**: Command will detect the existing study and report success with an "EXISTING" status
2. **With `--force` flag**: Command will proceed with creation attempt (useful for updating study info)

```
⚠ Warn Study ID my-study-123 already exists
```

## Architecture

### Command Layer

The `SongCreateStudyCommand` class orchestrates the study creation process:

1. Parameter validation
2. SONG service health verification
3. Existing study detection
4. Study payload transmission
5. Response handling and reporting

### Service Integration

The command integrates directly with the SONG API:

- Manages authentication headers
- Implements retry logic for resilience
- Handles existing study detection
- Provides structured response handling

## Configuration Options

### Environment Variables

- `SONG_URL`: Default SONG service URL
- `STUDY_ID`: Default study ID
- `STUDY_NAME`: Default study name
- `ORGANIZATION`: Default organization name
- `DESCRIPTION`: Default study description
- `AUTH_TOKEN`: Default authentication token

## Example Usage

### Basic Creation

```bash
# Create a study with default parameters
conductor songCreateStudy --song-url http://localhost:8080
```

### Detailed Configuration

```bash
# Create a fully specified study
conductor songCreateStudy \
  --song-url https://song.genomics-platform.org \
  --study-id genomics-project-2023 \
  --study-name "Comprehensive Genomic Analysis 2023" \
  --organization "Center for Genomic Research" \
  --description "Multi-center study of genetic markers in cancer patients" \
  --auth-token bearer_eyJhbGc...
```

### Force Creation

```bash
# Update an existing study by forcing creation
conductor songCreateStudy \
  --song-url http://localhost:8080 \
  --study-id existing-study \
  --study-name "Updated Study Name" \
  --force
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
   - Ensure proper authorization for study creation

3. **Study Creation Rejection**:
   - Check if study already exists (use `--force` to update)
   - Verify study ID format meets SONG requirements
   - Check for proper formatting of study name and organization
   - Review server logs for detailed rejection reasons

## Study Payload Structure

The command constructs a study payload with the following structure:

```json
{
  "studyId": "your-study-id",
  "name": "Your Study Name",
  "description": "Study description text",
  "organization": "Your Organization",
  "info": {}
}
```

The `info` field can be used for additional metadata but is sent as an empty object by default.

## Best Practices

- Use meaningful study IDs that reflect the project purpose
- Provide detailed and accurate study descriptions
- Use environment variables for consistent configuration
- Create studies before attempting to upload schemas or analyses
- Document study creation in project documentation
- Use the same authentication token for related operations

## Integration with SONG Workflow

The typical SONG metadata workflow follows these steps:

1. **Create Study** (using songCreateStudy)
2. **Upload Schema** (using songUploadSchema)
3. Upload analyses and data files
4. Query and manage metadata

Creating a study is the essential first step in this workflow.
