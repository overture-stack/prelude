# Score Manifest Upload

## Overview

The Score Manifest Upload feature provides a streamlined command-line interface for generating file manifests from SONG analyses and uploading data files to Score object storage. This command simplifies the data submission process by leveraging the native Score client for file uploads.

## Key Features

- Generate manifests from SONG analysis IDs
- Utilize native Score client for file uploads
- Simple and straightforward workflow
- Automatic manifest generation
- Flexible configuration options
- Support for environment variable configuration

## Workflow Integration

The Score Manifest Upload command is a key step in the Overture data submission workflow:

1. **Metadata Submission**: Submit analysis metadata to SONG
2. **File Upload**: Generate manifest and upload files with Score
3. **Publication**: Publish the analysis to make it available

## Command-Line Usage

```bash
conductor scoreManifestUpload --analysis-id <analysisId> [options]
```

### Required Parameters

- `--analysis-id, -a`: Analysis ID obtained from SONG submission (required)

### Optional Parameters

- `--data-dir, -d`: Directory containing the data files (default: "./data")
- `--output-dir, -o`: Directory for manifest file output (default: "./output")
- `--manifest-file, -m`: Custom path for manifest file (default: "<output-dir>/manifest.txt")
- `--song-url, -u`: SONG server URL (default: http://localhost:8080)
- `--score-url, -s`: Score server URL (default: http://localhost:8087)
- `--auth-token, -t`: Authentication token for Score client

## Manifest Generation

The command automatically generates a manifest file with the following format:

```
object_id                              file_path                    md5                              size      access
analysis-id-filename.vcf.gz            /full/path/to/filename.vcf.gz   94b790078d8e98ad08ffc42389e2fa68  17246    open
```

Key characteristics:

- Object ID is generated based on analysis ID and filename
- MD5 checksum is computed for each file
- Default access level is "open"

## Prerequisites

- Score client must be installed and accessible in the system PATH
- Requires valid authentication token
- Requires an existing analysis ID from SONG

## Example Usages

### Basic Upload

```bash
# Upload files for a specific analysis ID
conductor scoreManifestUpload --analysis-id 4d9ed1c5-1053-4377-9ed1-c51053f3771f
```

### Advanced Configuration

```bash
# Custom directories and authentication
conductor scoreManifestUpload \
  --analysis-id 4d9ed1c5-1053-4377-9ed1-c51053f3771f \
  --data-dir /path/to/sequencing/data \
  --output-dir /path/to/manifests \
  --auth-token your-score-access-token
```

## Environment Variables

The command supports the following environment variables:

- `ANALYSIS_ID`: Default analysis ID
- `DATA_DIR`: Default data directory
- `OUTPUT_DIR`: Default output directory
- `MANIFEST_FILE`: Custom manifest file path
- `SONG_URL`: SONG server URL
- `SCORE_URL`: Score server URL
- `AUTH_TOKEN`: Authentication token for Score client

## Troubleshooting

Common issues and solutions:

1. **Manifest Generation Failures**:

   - Verify analysis ID exists
   - Ensure data directory contains files
   - Check file permissions

2. **Upload Failures**:
   - Verify Score client is installed
   - Check authentication token
   - Ensure network connectivity
   - Verify Score client configuration

## Best Practices

- Organize data files clearly
- Use consistent naming conventions
- Validate files before upload
- Use environment variables for consistent configuration

## Complete Workflow Example

```bash
# Step 1: Submit metadata to Song
conductor songSubmitAnalysis --analysis-file SP059902.vcf.json

# Step 2: Upload files to Score
conductor scoreManifestUpload --analysis-id <generated-analysis-id>

# Step 3: Publish the analysis
conductor songPublishAnalysis --analysis-id <generated-analysis-id>
```

## Testing and Validation

```bash
# Basic upload
conductor scoreManifestUpload -a your-analysis-id

# Debug mode for detailed logging
conductor scoreManifestUpload -a your-analysis-id --debug

# Specify custom data directory
conductor scoreManifestUpload -a your-analysis-id -d /custom/data/path
```

## Limitations

- Relies on external Score client
- Uses a simple MD5 computation method
- Requires manual configuration of Score client profile
