# Lyric Dictionary Registration

## Overview

The Lyric Dictionary Registration feature provides a command-line interface for registering data dictionaries with a Lyric service. It streamlines the process of dictionary management across different environments, ensuring consistent data definitions and schema availability.

## Key Features

- Register data dictionaries with Lyric service
- Automatic health check verification
- Multiple retry attempts for improved reliability
- Comprehensive error handling
- Support for various environment configurations
- Command-line and programmatic interfaces
- Flexible configuration through environment variables or command options

## Health Check Mechanism

The registration process includes an automated health check:

- **Connection Attempts**: 3 retry attempts
- **Retry Delay**: 5 seconds between attempts
- **Timeout**: 10 seconds per attempt
- **Status Verification**:
  - Validates Lyric service availability
  - Checks health endpoint status
  - Provides detailed connection diagnostics

## URL Handling

Intelligent URL normalization ensures compatibility:

- Removes trailing slashes
- Automatically determines the correct registration endpoint
- Supports multiple URL formats and configurations
- Maintains path integrity

## Command-Line Usage

```bash
conductor lyricRegister [options]
```

### Required Parameters

- `--lyric-url, -u`: Lyric service URL (required or via LYRIC_URL environment variable)

### Optional Parameters

- `--category-name, -c`: Category name (default: "clinical")
- `--dictionary-name, -d`: Dictionary name (default: "clinical_data_dictionary")
- `--dictionary-version, -v`: Dictionary version (default: "1.0")
- `--default-centric-entity, -e`: Default centric entity (default: "clinical_data")
- `--output, -o`: Output directory for response logs
- `--force`: Force overwrite of existing files
- `--debug`: Enable detailed debug logging

## Environment Variables

All command parameters can be configured through environment variables:

- `LYRIC_URL`: Lyric service URL
- `CATEGORY_NAME`: Category name
- `DICTIONARY_NAME`: Dictionary name
- `DICTIONARY_VERSION`: Dictionary version
- `DEFAULT_CENTRIC_ENTITY`: Default centric entity

## Error Handling Capabilities

Comprehensive error handling includes:

- **Configuration Validation**:
  - Required parameter checking
  - URL format validation
- **Connection Errors**:
  - Service unreachable
  - Network issues
  - Timeout handling
- **Registration Errors**:
  - Duplicate dictionary detection
  - Parameter validation
  - Detailed error reporting
- **Dictionary Already Exists**:
  - Clearly indicates when a dictionary with the same parameters already exists
  - Shows the specific parameters that caused the conflict
  - Provides suggestions for resolution
- **Parameter Validation Errors**:
  - Detailed information about which parameter failed validation
  - Shows the validation rule that was violated
  - Suggests corrective actions
- **Connection Issues**:
  - Comprehensive details about connection failures
  - Information about network and endpoint status
  - Troubleshooting suggestions specific to the error type

### Error Scenario Examples

```
✗ Error: Lyric Dictionary Registration Failed
   Type: Connection Error
   Message: Failed to connect to Lyric service
   Details: Unable to establish connection with Lyric service
```

## Architecture

### Command Layer

The `LyricRegistrationCommand` class handles the dictionary registration process:

1. Validates the required parameters
2. Checks Lyric service health
3. Registers the dictionary with retry support
4. Provides detailed logging and error reporting

### Service Layer

The `LyricService` manages interactions with the Lyric service:

- Normalizes service URLs
- Handles parameter validation
- Manages dictionary registration requests
- Performs health checks

## Example Usage

### Basic Registration

```bash
# Register a dictionary with the default configuration
conductor lyricRegister --lyric-url http://localhost:3030
```

### Custom Configuration

```bash
# Register with custom dictionary parameters
conductor lyricRegister \
  --lyric-url https://lyric.example.com \
  --category-name genomics \
  --dictionary-name gene_dictionary \
  --dictionary-version 2.1 \
  --default-centric-entity gene_data \
  --output ./lyric-logs
```

### Using Environment Variables

```bash
# Set environment variables
export LYRIC_URL=http://localhost:3030
export CATEGORY_NAME=clinical
export DICTIONARY_NAME=patient_dictionary
export DICTIONARY_VERSION=1.5
export DEFAULT_CENTRIC_ENTITY=patient_data

# Register using environment configuration
conductor lyricRegister
```

## Standalone Script

A standalone bash script is also provided for direct usage:

```bash
# Use the standalone script
./lyric-register.sh
```

## Troubleshooting

Common issues and solutions:

1. **Connection Failures**:

   - Verify Lyric service URL
   - Check service availability
   - Ensure network connectivity

2. **Registration Errors**:

   - Verify parameter values
   - Check for duplicate dictionary entries
   - Ensure Lyric service is properly configured

3. **Environment Issues**:
   - Validate environment variable settings
   - Check for conflicting command-line options
   - Verify service compatibility

## Extending the Feature

To extend this feature:

1. Add new validation logic in the registration command
2. Enhance error handling with more detailed diagnostics
3. Implement additional Lyric service operations
4. Add support for bulk registrations

## Best Practices

- Use environment variables for consistent configurations
- Implement logging for traceability
- Handle potential network and service errors gracefully
- Verify service health before attempting registration

## Testing

```bash
# Basic dictionary registration
conductor lyricRegister -u http://localhost:3030

# Registration with debug logging
conductor lyricRegister -u http://localhost:3030 --debug

# Specify custom dictionary parameters
conductor lyricRegister -u http://localhost:3030 -c genomics -d gene_dictionary -v 2.0
```
