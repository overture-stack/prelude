# Phase Two

## Overview

**In this guide we will** extend our data management capabilities by implementing data submission validation, storage, and publication processes.

**By the end of this guide you will be able to:**

1. Manage data submission validation using Lectern dictionary schema manager
2. Complete a full data submission workflow with Lyric
3. Index and store submitted data with Maestro
4. View submitted data in the front-end UI configured in Phase One

## Prerequisites and Requirements

**You will need:**

- Completed Phase One configuration including:
  - Updated docker-compose.yml
  - Index mapping templates
  - Arranger configuration files
- A basic understanding of the following software:
  - [Lectern](https://docs.overture.bio/docs/core-software/Lectern/overview)
  - [Lyric](https://docs.overture.bio/docs/core-software/Lyric/overview/)
  - [Maestro](https://docs.overture.bio/docs/core-software/Maestro/overview)
- Optionally, tools for viewing and managing data submissions

## Background Information

Phase Two focuses on establishing a data submission and management workflow for tabular data. This phase introduces tools to validate, store, and publish data while maintaining data integrity and consistency across your platform.

### Architecture Overview

The phase architecture is diagrammed below and detailed in the following table:

![Phase 2 Architecture](/docs/images/phase2.png "Phase 2 Architecture")

| Component   | Description                                                             |
| ----------- | ----------------------------------------------------------------------- |
| **Lectern** | A dictionary schema manager that defines and validates data structures  |
| **Lyric**   | A submission management system for data validation and workflow control |
| **Maestro** | A data indexing and storage service for submitted data                  |
| **Song**    | A metadata management system for tracking data submissions              |
| **Score**   | A file transfer and storage service for data files                      |

## Step 1: Data Dictionary Setup

### Preparing Your Data

[split data files up into grainular units, each file now needs to be represeted by a schema, alternatively you may chose to keep all your data in one file as one schema]

### Generate the Dictionary

1. Run the Composer command to generate a Lectern dictionary:

   ```bash
   composer -p generateLecternDictionary -f clinical.csv demographics.csv
   ```

   <details>
   <summary>Command Breakdown</summary>

   In this command:

   - `-p generateLecternDictionary`: Specifies the operation to generate a Lectern dictionary
   - `-f clinical.csv demographics.csv`: Specifies input data files to analyze
   - Additional options include:
     - `-o, --output <path>`: Output file path for generated dictionary
     - `-n, --name <n>`: Dictionary name
     - `-v, --version <version>`: Dictionary version
     - `--delimiter <char>`: CSV delimiter

   The command analyzes the structure of input CSV files and creates a comprehensive data dictionary that defines the structure, constraints, and metadata for your datasets.
   </details>

2. Validate the generated dictionary:
   - Review the dictionary structure
   - Confirm all required fields are present
   - Check data types and constraints

### Upload the Dictionary

1. Upload the dictionary to Lectern:

   ```bash
   conductor lecternUpload -s dictionary.json
   ```

   <details>
   <summary>Command Breakdown</summary>

   In this command:

   - `-s, --schema-file <path>`: Specifies the dictionary JSON file to upload
   - Additional options include:
     - `-u, --lectern-url <url>`: Lectern server URL
     - `-t, --auth-token <token>`: Authentication token
     - `-o, --output <path>`: Output directory for logs

   This step registers your data dictionary with the Lectern service, enabling validation and management of data submissions.
   </details>

## Step 2: Register Dictionary with Lyric

1. Register the dictionary in Lyric:

   ```bash
   conductor lyricRegister -c category1 --dict-name dictionary1 -v 1.0
   ```

   <details>
   <summary>Command Breakdown</summary>

   In this command:

   - `-u, --lyric-url <url>`: Lyric server URL
   - `-c, --category-name <name>`: Category name for the dictionary
   - `--dict-name <name>`: Name of the dictionary
   - `-v, --dictionary-version <version>`: Dictionary version
   - `-e, --default-centric-entity <entity>`: Default centric entity

   This step integrates the dictionary with Lyric, preparing it for data submission and validation.
   </details>

## Step 3: Upload Data to Lyric

1. Upload data files:

   ```bash
   conductor lyricData -d ./data-directory
   ```

   <details>
   <summary>Command Breakdown</summary>

   In this command:

   - `-u, --lyric-url <url>`: Lyric server URL
   - `-l, --lectern-url <url>`: Lectern server URL
   - `-d, --data-directory <path>`: Directory containing CSV data files
   - `-c, --category-id <id>`: Category ID
   - `-g, --organization <name>`: Organization name
   - `-m, --max-retries <number>`: Maximum retry attempts

   This step uploads your data files to Lyric for validation against the previously registered dictionary.
   </details>

## Validation

After completing these steps, verify:

- Dictionary is successfully uploaded to Lectern
- Dictionary is registered in Lyric
- Data files pass validation
- Data is indexed in Maestro

## Troubleshooting

Common issues and solutions:

- Dictionary validation failures
- Data type mismatches
- Connectivity problems with Lyric or Lectern

## Next Steps

With your data submitted and validated, you are now ready to:

- View data in the Stage UI
- Perform further analysis
- Expand your data management workflow

## Additional Resources

- [Lectern Documentation](https://docs.overture.bio/docs/core-software/Lectern/overview)
- [Lyric Documentation](https://docs.overture.bio/docs/core-software/Lyric/overview/)
- [Maestro Documentation](https://docs.overture.bio/docs/core-software/Maestro/overview)
