# Repository Indexing Command

## Overview

The Repository Indexing command allows you to trigger indexing operations on a repository with varying levels of specificity. This command sends a POST request to the indexing service, enabling you to index a specific repository, optionally filtered by organization and ID.

## Key Features

- Simple repository-wide indexing operations
- Organization-specific indexing
- Precise indexing targeting specific document IDs
- Comprehensive error handling and detailed reporting
- Environment variable support for CI/CD integration

## Command-Line Usage

```bash
conductor indexRepository --repository-code <code> [options]
```

### Required Parameters

- `--repository-code <code>`: Code of the repository to index (required)

### Optional Parameters

- `--index-url <url>`: Indexing service URL (default: http://localhost:11235)
- `--organization <name>`: Filter indexing to a specific organization
- `--id <id>`: Index only a specific document ID (requires organization parameter)
- `--output, -o`: Output directory for response logs
- `--force`: Skip confirmation prompts
- `--debug`: Enable detailed debug logging

## Environment Variables

All command parameters can also be configured through environment variables:

- `INDEX_URL`: Indexing service URL
- `REPOSITORY_CODE`: Repository code to index
- `ORGANIZATION`: Organization name filter
- `ID`: Specific ID to index

## Example Usage

### Basic Indexing

Index an entire repository:

```bash
conductor indexRepository --repository-code lyric.overture
```

### Organization-Specific Indexing

Index all documents from a specific organization:

```bash
conductor indexRepository --repository-code lyric.overture --organization OICR
```

### Specific Document Indexing

Index a single document by ID:

```bash
conductor indexRepository --repository-code lyric.overture --organization OICR --id DO123456
```

### Custom Index URL

Use a custom indexing service URL:

```bash
conductor indexRepository --repository-code lyric.overture --index-url http://index-service:8080
```

## Troubleshooting

Common issues and solutions:

1. **Connection Refused**: Ensure the indexing service is running at the specified URL
2. **Repository Not Found**: Verify that the repository code is correct
3. **Authentication Error**: Check if you have the necessary permissions
4. **Timeout**: The indexing service might be under heavy load or the operation is complex
