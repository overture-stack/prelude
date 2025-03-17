# Phase Two

## Overview

**In this guide you will** extend your data management capabilities by implementing robust data submission validation, storage, and publication processes.

**By the end of this guide you will be able to:**

1. Validate data submissions using the Lectern dictionary schema manager
2. Complete an end-to-end data submission workflow with Lyric
3. Index validated data with Maestro
4. Access and view indexed data through the front-end UI configured in Phase One

## Prerequisites

**You will need:**

- Completed Phase One configuration including:
  - Updated docker-compose.yml
  - Index mapping templates
  - Arranger configuration files
- A basic understanding of the following Overture services:
  - [Lectern](https://docs.overture.bio/docs/core-software/Lectern/overview) - Dictionary schema management
  - [Lyric](https://docs.overture.bio/docs/core-software/Lyric/overview/) - Submission workflow management
  - [Maestro](https://docs.overture.bio/docs/core-software/Maestro/overview) - Data indexing service
- Your data table file(s) from Phase One (which may need to be divided into multiple schemas)

## Background Information

Phase Two establishes your data submission and management workflow. This phase introduces tools to validate, store, and publish data while maintaining data integrity and consistency across your platform.

Your Phase One data file may need to be divided into multiple segments represented as schemas to support distributed data collection from different teams or departments.

### Architecture Overview

The Phase Two architecture includes these components:

![Phase 2 Architecture](/docs/images/phase2.png "Phase 2 Architecture")

| Component   | Purpose                                                               |
| ----------- | --------------------------------------------------------------------- |
| **Lectern** | Dictionary schema manager that defines and validates data structures  |
| **Lyric**   | Submission management system for data validation and workflow control |
| **Maestro** | Data indexing and storage service for submitted data                  |
| **Song**    | Metadata management system for tracking data submissions              |
| **Score**   | File transfer and storage service for data files                      |

## Step 1: Deploy Phase 2 Services

1. Run the deployment command:

   ```bash
   make phase2
   ```

2. Verify service health:
   - The deployment script should automatically verify that all services are running correctly
   - Check the container logs if any service fails to start properly

## Step 2: Set Up Data Dictionary

### A) Prepare Your Clinical Data

Depending on your requirements, you may need to separate your data into multiple schemas to support distributed submission processes.

**Example: Clinical Data Schema Division**

For demonstration purposes, we've separated our clinical cancer dataset from Phase One's `dataTable1.csv` into five logical files:

| File              | Owner             | Contains                                    |
| ----------------- | ----------------- | ------------------------------------------- |
| **donor.csv**     | Registration Team | Demographic information and primary IDs     |
| **diagnosis.csv** | Diagnostic Team   | Condition details with references to donors |
| **specimen.csv**  | Laboratory Team   | Sample information linked to diagnoses      |
| **treatment.csv** | Treatment Team    | Intervention details linked to diagnoses    |
| **followup.csv**  | Follow-up Team    | Outcome information linked to diagnoses     |

Directory structure example:

```
data/
├── datatable1.csv                  # Original combined file
└── segmentedDataTable1/            # Directory with segmented files
    ├── donor.csv
    ├── diagnosis.csv
    ├── specimen.csv
    ├── treatment.csv
    └── followup.csv
```

Analyze your own data to determine if similar division would be beneficial. If not, you can proceed with a single schema representing your original data structure.

### B) Generate the Dictionary

1. For multiple segmented data files:

   ```bash
   composer -p generateLecternDictionary -f ./data/segmentedData/ -n clinical-cancer-data -v 1.0 -o ./configs/lecternDictionaries/
   ```

2. For a single data file:

   ```bash
   composer -p generateLecternDictionary -f ./data/dataTable1.csv -n dataTableOneDictionary -v 1.0 -o ./configs/lecternDictionaries/
   ```

   <details>
   <summary>Command Breakdown</summary>

   In this command:

   - `-p generateLecternDictionary`: Specifies the operation to generate a Lectern dictionary
   - `-f ./data/segmentedData/`: Specifies the directory containing our segmented data files
   - `-n clinical-cancer-data`: Names the dictionary
   - `-v 1.0`: Sets the dictionary version
   - `-o ./configs/lecternDictionaries/`: Output directory for the generated dictionary
   - Additional options include:
     - `--delimiter <char>`: CSV delimiter (if different from default)

   The command analyzes the structure of input CSV files and creates a comprehensive data dictionary that defines the structure, constraints, and metadata for your clinical datasets.
   </details>

### C) Review and Enhance the Dictionary

The generated dictionary provides a basic structure derived from your CSV files. You should review and enhance it to ensure data integrity.

Example of a generated dictionary structure:

```json
{
  "name": "clinical-cancer-data",
  "description": "Generated dictionary from CSV files",
  "version": "1.0",
  "schemas": [
    {
      "name": "diagnosis",
      "description": "Schema generated from diagnosis.csv",
      "fields": [
        {
          "name": "diagnosis_id",
          "description": "Field containing diagnosis_id data",
          "valueType": "string",
          "meta": {
            "displayName": "diagnosis_id"
          }
        }
        // Additional fields...
      ],
      "meta": {
        "createdAt": "2025-03-17T18:54:20.265Z",
        "sourceFile": "diagnosis.csv"
      }
    }
    // Additional schemas...
  ],
  "meta": {}
}
```

Review and enhance the following elements:

#### 1. Dictionary Structure

- Verify all required properties: `name`, `version`, and `schemas`
- Add a meaningful `description` that explains the purpose of your dictionary
- Add custom metadata in the `meta` object if needed

#### 2. Schema Validation

- Confirm all expected schemas are present (donor, diagnosis, specimen, etc.)
- Ensure each schema has a unique `name` property without whitespace or periods
- Review and improve each schema's `description`

#### 3. Field Definitions

- Verify each field has the correct `valueType` (`string`, `integer`, `number`, or `boolean`)
- For array fields, add `"isArray": true` and specify a `delimiter`
- Enhance `meta` information for better user experience

**Example of field enhancement:**

```json
// Original auto-generated field
{
  "name": "treatment_drugs",
  "description": "Field containing treatment_drugs data",
  "valueType": "string",
  "meta": {
    "displayName": "treatment_drugs"
  }
}

// Enhanced field definition
{
  "name": "treatment_drugs",
  "description": "List of drugs used in the treatment regimen",
  "valueType": "string",
  "isArray": true,
  "delimiter": "|",
  "meta": {
    "displayName": "Treatment Drugs",
    "guidance": "Provide all drugs used in this treatment, separated by pipe (|) characters"
  }
}
```

#### 4. Add Validation Rules

Add restrictions to enforce data validation:

```json
"restrictions": {
  "required": true,             // Field must have a value
  "regex": "^DO[0-9]{4}$",      // Pattern validation for IDs
  "codeList": ["Male", "Female"], // Enumeration of allowed values
  "range": {"min": 0, "max": 120} // Numeric range validation
}
```

#### 5. Implement Conditional Logic

Add conditional validation for interdependent fields:

```json
"restrictions": {
  "if": {
    "conditions": [
      {
        "fields": ["vital_status"],
        "match": { "value": "Deceased" }
      }
    ]
  },
  "then": { "required": true },
  "else": { "empty": true }
}
```

#### 6. Define Field Relationships

For fields that reference other schemas:

```json
"restrictions": {
  "compare": {
    "fields": ["other_field"],
    "relation": "equal"
  }
}
```

#### 7. Add Uniqueness Constraints

For identifier fields:

```json
"name": "donor_id",
"valueType": "string",
"unique": true,
"restrictions": { "required": true }
```

## Step 3: Upload the Dictionary to Lectern

Upload you updated dictionary to Lectern

```bash
conductor lecternUpload -s ./configs/lecternDictionaries/dictionary.json -u http://localhost:3031
```

<details>
<summary>Command Breakdown</summary>

Lectern Schema Upload Command:
conductor lecternUpload -s dictionary.json
Options:
-s, --schema-file <path> Schema JSON file to upload (required)
-u, --lectern-url <url> Lectern server URL (default: http://localhost:3031)
-t, --auth-token <token> Authentication token (optional)
-o, --output <path> Output directory for logs

Example: conductor lecternUpload -s data-dictionary.json

</details>

## Step 4: Register Dictionary with Lyric

Register your enhanced dictionary with Lyric:

```bash
conductor lyricRegister -c clinical-cancer --dict-name clinical-cancer-data -v 1.0 -e donor
```

<details>
<summary>Command Breakdown</summary>

In this command:

Lyric Register Dictionary Command:
conductor lyricRegister -c category1 --dict-name dictionary1 -v 1.0
Options:
-u, --lyric-url <url> Lyric server URL (default: http://localhost:3030)
-c, --category-name <name> Category name
--dict-name <name> Dictionary name
-v, --dictionary-version <version> Dictionary version
-e, --default-centric-entity <entity> Default centric entity (default: clinical_data)

Example: conductor lyricRegister -c my-category --dict-name my-dictionary -v 2.0

This step updates the dictionary with Lyric, preparing it for clinical data submission and validation.

</details>

## Step 5: Upload Data to Lyric

Upload your data files in the correct order to ensure proper validation of interdependent records:

1. Start with donor data (base entity):

   ```bash
   conductor lyricData -d ./data/segmentedDataTable1/donor.csv -c clinical-cancer -g cancer-center
   ```

2. After donor validation succeeds, upload diagnosis data:

   ```bash
   conductor lyricData -d ./data/segmentedDataTable1/diagnosis.csv -c clinical-cancer -g cancer-center
   ```

3. Continue with remaining schemas:
   ```bash
   conductor lyricData -d ./data/segmentedDataTable1/specimen.csv -c clinical-cancer -g cancer-center
   conductor lyricData -d ./data/segmentedDataTable1/treatment.csv -c clinical-cancer -g cancer-center
   conductor lyricData -d ./data/segmentedDataTable1/followup.csv -c clinical-cancer -g cancer-center
   ```

<details>
<summary>Command Breakdown</summary>

In these commands:

- `-d, --data-directory <path>`: Path to the specific CSV data file
- `-c, --category-id clinical-cancer`: Category ID for the submission
- `-g, --organization cancer-center`: Organization name submitting the data
- Additional options include:
  - `-u, --lyric-url <url>`: Lyric server URL
  - `-l, --lectern-url <url>`: Lectern server URL
  - `-m, --max-retries <number>`: Maximum retry attempts

This sequential upload ensures that each dataset is properly validated against the dictionary and that dependent records exist before related records are added.

</details>

This sequential upload ensures that each dataset is properly validated against the dictionary and that dependent records exist before related records are added.

## Additional Resources

- [Lectern Documentation](https://docs.overture.bio/docs/core-software/Lectern/overview)
- [Lyric Documentation](https://docs.overture.bio/docs/core-software/Lyric/overview/)
- [Maestro Documentation](https://docs.overture.bio/docs/core-software/Maestro/overview)
- [Overture Support Forum](https://docs.overture.bio/community/support)
