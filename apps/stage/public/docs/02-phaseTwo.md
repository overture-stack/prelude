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

- Your data table file(s) from Phase One (which may need to be divided into multiple schemas)
- A basic understanding of the following Overture services:
  - [Lectern](https://docs.overture.bio/docs/core-software/Lectern/overview) - Dictionary schema management
  - [Lyric](https://docs.overture.bio/docs/core-software/Lyric/overview/) - Submission workflow management
  - [Maestro](https://docs.overture.bio/docs/core-software/Maestro/overview) - Data indexing service

## Background Information

Phase Two establishes your data submission and management workflow. This phase introduces tools to validate, store, and publish data while maintaining data integrity and consistency across your platform.

Your Phase One data file may need to be divided into multiple segments represented as schemas to support distributed data collection from different teams or departments.

### Architecture Overview

The Phase Two architecture includes these components:

![Phase 2 Architecture](/docs/images/phase2.png "Phase 2 Architecture")

| Component                                                                    | Purpose                                                               |
| ---------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| **[Lectern](https://docs.overture.bio/docs/core-software/Lectern/overview)** | Dictionary schema manager that defines and validates data structures  |
| **[Lyric](https://docs.overture.bio/docs/core-software/Lyric/overview)**     | Submission management system for data validation and workflow control |
| **[Maestro](https://docs.overture.bio/docs/core-software/Maestro/overview)** | Data indexing and storage service for submitted data                  |

## Step 1: Deploy Phase 2 Services

1. Run the deployment command:

   ```bash
   make phase2
   ```

2. Verify service health:
   - The deployment script should automatically verify that all services are running correctly
   - Check the container logs if any service fails to start properly

## Step 2: Set Up Data Dictionary

In phase one we represented our data as a flat file with each row representing a single entity. Yet, data often involves complex relationships between entities. For example, a single donor can have multiple diagnoses, and this one-to-many relationship cannot be properly represented in a flat, single-table structure without data duplication or loss of information.

When dealing with nested or hierarchical data structurers, a relational approach using multiple schemas is necessary to acaccuratelycuratley represent these relationships.

### A) Prepare Your Tabular Data

Depending on your data complexity you will need to organize information into multiple related schemas that can be properly linked. For this we will use Lectern, Overtures schema dictionary manager

**Example: Clinical Data Schema Division**

For demonstration purposes, we've separated our clinical cancer dataset from Phase One's `dataTable1.csv` into four logical files:

![Enitity Relationship](/docs/images/entityRelationshipDiagram.png "Entity Relationship Diagram")

| File              | Owner                                       | Relationship                                                                             |
| ----------------- | ------------------------------------------- | ---------------------------------------------------------------------------------------- |
| **donor.csv**     | Demographic information and primary IDs     | One donor can have many diagnoses                                                        |
| **diagnosis.csv** | Condition details with references to donors | Each diagnosis belongs to exactly one donor (via donor_id)                               |
| **treatment.csv** | Intervention details linked to diagnoses    | Each treatment belongs to exactly one donor (via donor_id)                               |
| **followup.csv**  | Outcome information linked to diagnoses     | For simplicity each followup is associated with exactly one treatment (via treatment_id) |

Based on the above we have taken our flat data file from phaseOne and segmented it accordingly:

```
data/
├── datatable1.csv                  # Original combined file
└── segmentedDataTable1/            # Directory with segmented files
    ├── donor.csv
    ├── diagnosis.csv
    ├── treatment.csv
    └── followup.csv
```

Analyze your own data to determine if similar division is required. If not, you can proceed with a single schema representing your original data structure.

Looking at the document in progress, I'll help refine and complete steps B and C for the Phase Two guide. These steps focus on generating and customizing a Lectern dictionary schema from data files.

### B) Generate the Dictionary

Now that we have established our data structure and organized our files, we can proceed with creating our Lectern dictionary schema.

1. To generate a base Lectern dictionary schema from multiple segmented data files, run:

   ```bash
   composer -p generateLecternDictionary -f ./data/segmentedData/ -n example-dictionary -v 1.0 -o ./configs/lecternDictionaries/
   ```

2. For a single data file, you can point to your flat file:

   ```bash
   composer -p generateLecternDictionary -f ./data/dataTable1.csv -n dataTableOneDictionary -v 1.0 -o ./configs/lecternDictionaries/
   ```

   <details>
   <summary>Command Breakdown</summary>

   In this command:

   - `-p generateLecternDictionary`: Specifies the operation to generate a Lectern dictionary
   - `-f ./data/segmentedData/`: Specifies the directory containing our segmented data files
   - `-n example-dictionary`: Names the dictionary
   - `-v 1.0`: Sets the dictionary version
   - `-o ./configs/lecternDictionaries/`: Output directory for the generated dictionary

   The command analyzes the structure of input CSV files and creates a base data Lectern dictionary defining the structure of the dataset. Each file will be represented as a schema, with the file name used as the schema name in the generated dictionary.
   </details>

3. After running the command, verify that the dictionary file was created in the output directory:

### C) Review and Update the Lectern Dictionary

The generated dictionary provides a basic structure derived from your CSV files. Now we'll review and update each component to improve data validation and establish entity relationships.

#### 1. Dictionary Metadata

We will first update our top-level dictionary metadata:

```json
{
  "name": "example-dictionary",
  "description": "A Lectern dictionary for Overture's Phase Two Prelude guide focused on clinical cancer data",
  "version": "1.0",
  "meta": {
    "createdAt": "2025-03-20T10:30:00.000Z",
    "createdBy": "Mitchell Shiell",
    "primaryContact": "mshiell@oicr.on.ca"
  }
}
```

#### 2. Schema Descriptions

We will next update each schema with more descriptive information:

<details>
<summary>Click here to view our updated dictionary</summary>
```json
"schemas": [
  {
    "name": "donor",
    "description": "Core demographic information about donors. One donor can have multiple diagnoses, treatments, and followups.",
    "fields": [
      // Schema fields...
    ],
    "meta": {
      "sourceFile": "donor.csv",
      "primaryEntity": true
    }
  },
  {
    "name": "diagnosis",
    "description": "Clinical diagnosis details linked to a donor via donor_id. Each diagnosis belongs to exactly one donor.",
    "fields": [
      // Schema fields...
    ],
    "meta": {
      "sourceFile": "diagnosis.csv"
    }
  },
  {
    "name": "treatment",
    "description": "Treatment information linked to a donor and diagnosis. Each treatment belongs to exactly one donor.",
    "fields": [
      // Schema fields...
    ],
    "meta": {
      "sourceFile": "treatment.csv"
    }
  },
  {
    "name": "followup",
    "description": "Follow-up assessment information linked to treatments and donors. Each followup is associated with exactly one treatment.",
    "fields": [
      // Schema fields...
    ],
    "meta": {
      "sourceFile": "followup.csv"
    }
  }
]
```
</details>

#### 3. Field Definitions

Review and update field definitions to include proper data types, validation rules, and meaningful descriptions. Here are some examples of how to enhance field definitions:

<details>
<summary>Click here to view examples of updated fields</summary>
```json
"fields": [
  {
    "name": "donor_id",
    "description": "Unique identifier for a donor across the system",
    "valueType": "string",
    "restrictions": {
      "required": true,
      "unique": true,
      "regex": "^DO\\d{4}$"
    },
    "meta": {
      "displayName": "Donor ID",
      "examples": ["DO0599", "DO0600"]
    }
  },
  {
    "name": "age_at_diagnosis",
    "description": "Age of the donor at the time of diagnosis in years",
    "valueType": "integer",
    "restrictions": {
      "required": true,
      "range": {"min": 0, "max": 120}
    },
    "meta": {
      "displayName": "Age at Diagnosis",
      "units": "years"
    }
  },
  {
    "name": "vital_status",
    "description": "Current vital status of the donor",
    "valueType": "string",
    "restrictions": {
      "required": true,
      "codeList": [
        {"code": "Alive", "description": "Donor is alive at last follow-up"},
        {"code": "Deceased", "description": "Donor is deceased"}
      ]
    },
    "meta": {
      "displayName": "Vital Status"
    }
  }
]
```
</details>

For more information on Lectern validation rules see our [preliminary Lectern documentation found here](https://github.com/overture-stack/lectern/blob/develop/docs/dictionary-reference.md)

#### 4. Defining Entity Relationships

The `foreignKey` restriction establishes relationships between different schemas in your Lectern dictionary:

```json
"restrictions": {
  "foreignKey": [
    {
      "schema": "donor",
      "mappings": [{ "local": "donor_id", "foreign": "donor_id" }]
    }
  ]
}
```

<details>
<summary>Syntax Breakdown</summary>

- The `foreignKey` field defines a parent-child relationship between two schemas
  - `"schema": "donor"` specifies that this schema references the "donor" schema
  - `"mappings"` indicates which fields connect the two schemas:
    - `"local": "donor_id"` is the field in the current schema
    - `"foreign": "donor_id"` is the field in the referenced (donor) schema

This constraint ensures that every value in the current schema's `donor_id` field must exist in the `donor_id` field of the donor schema. For example, you cannot add a diagnosis record with a donor ID that doesn't exist in the donor table, maintaining data integrity across your related schemas.

</details>

We will add foreign key constraints to establish the relationships diagrammed earlier:

<details>
<summary>Click here to view the updated dictionary</summary>
```json
"schemas": [
  {
    "name": "donor",
    "description": "Core demographic information about donors. One donor can have multiple diagnoses, treatments, and followups.",
    "fields": [
      // Fields...
    ],
    "restrictions": {
      "primaryKey": ["donor_id"]
    },
    "meta": {
      "sourceFile": "donor.csv",
      "primaryEntity": true
    }
  },
  {
    "name": "diagnosis",
    "description": "Clinical diagnosis details linked to a donor via donor_id. Each diagnosis belongs to exactly one donor.",
    "fields": [
      // Fields...
    ],
    "restrictions": {
      "primaryKey": ["diagnosis_id"],
      "foreignKey": [
        {
          "schema": "donor",
          "mappings": [{ "local": "donor_id", "foreign": "donor_id" }]
        }
      ]
    },
    "meta": {
      "sourceFile": "diagnosis.csv"
    }
  },
  {
    "name": "treatment",
    "description": "Treatment information linked to a donor and diagnosis. Each treatment belongs to exactly one donor.",
    "fields": [
      // Fields...
    ],
    "restrictions": {
      "primaryKey": ["treatment_id"],
      "foreignKey": [
        {
          "schema": "donor",
          "mappings": [{ "local": "donor_id", "foreign": "donor_id" }]
        }
      ]
    },
    "meta": {
      "sourceFile": "treatment.csv"
    }
  },
  {
    "name": "followup",
    "description": "Follow-up assessment information linked to treatments and donors. Each followup is associated with exactly one treatment.",
    "fields": [
      // Fields...
    ],
    "restrictions": {
      "primaryKey": ["followup_id"],
      "foreignKey": [
        {
          "schema": "treatment",
          "mappings": [{ "local": "treatment_id", "foreign": "treatment_id" }]
        }
      ]
    },
    "meta": {
      "sourceFile": "followup.csv"
    }
  }
]
```

</details>

#### 5. Save your updated dictionary

The Lectern dictionary is now properly configured with appropriate schemas, field definitions, and entity relationships that accurately represent our data model. In the next steps, we will update lectern with our dictionary and then use this dictionary to validate and process data submissions through Lyric and Maestro.

<details>
<summary>Click here to view the completed dictionary</summary>

```
{
  "name": "example-dictionary",
  "description": "A Lectern dictionary for Overture's Phase Two Prelude guide focused on clinical cancer data",
  "version": "1.0",
  "meta": {
    "createdAt": "2025-03-20T10:30:00.000Z",
    "createdBy": "Mitchell Shiell",
    "primaryContact": "mshiell@oicr.on.ca"
  },
  "schemas": [
    {
      "name": "donor",
      "description": "Core demographic information about donors. One donor can have multiple diagnoses, treatments, and followups.",
      "fields": [
        {
          "name": "donor_id",
          "description": "Unique identifier for a donor across the system",
          "valueType": "string",
          "restrictions": {
            "required": true,
            "unique": true,
            "regex": "^DO\\d{4}$"
          },
          "meta": {
            "displayName": "Donor ID",
            "examples": ["DO0599", "DO0600"]
          }
        },
        {
          "name": "gender",
          "description": "Gender of the donor",
          "valueType": "string",
          "restrictions": {
            "required": true,
            "codeList": [
              {"code": "Male", "description": "Male donor"},
              {"code": "Female", "description": "Female donor"}
            ]
          },
          "meta": {
            "displayName": "Gender"
          }
        },
        {
          "name": "vital_status",
          "description": "Current vital status of the donor",
          "valueType": "string",
          "restrictions": {
            "required": true,
            "codeList": [
              {"code": "Alive", "description": "Donor is alive at last follow-up"},
              {"code": "Deceased", "description": "Donor is deceased"}
            ]
          },
          "meta": {
            "displayName": "Vital Status"
          }
        }
      ],
      "restrictions": {
        "primaryKey": ["donor_id"]
      },
      "meta": {
        "createdAt": "2025-03-20T16:11:06.493Z",
        "sourceFile": "donor.csv",
        "primaryEntity": true
      }
    },
    {
      "name": "diagnosis",
      "description": "Clinical diagnosis details linked to a donor via donor_id. Each diagnosis belongs to exactly one donor.",
      "fields": [
        {
          "name": "diagnosis_id",
          "description": "Unique identifier for a diagnosis record",
          "valueType": "string",
          "restrictions": {
            "required": true,
            "unique": true,
            "regex": "^PD\\d{6}$"
          },
          "meta": {
            "displayName": "Diagnosis ID",
            "examples": ["PD059901", "PD059902"]
          }
        },
        {
          "name": "donor_id",
          "description": "Reference to the donor this diagnosis belongs to",
          "valueType": "string",
          "restrictions": {
            "required": true,
            "regex": "^DO\\d{4}$"
          },
          "meta": {
            "displayName": "Donor ID",
            "examples": ["DO0599", "DO0600"]
          }
        },
        {
          "name": "primary_site",
          "description": "Primary anatomical site of the diagnosed condition",
          "valueType": "string",
          "restrictions": {
            "required": true
          },
          "meta": {
            "displayName": "Primary Site",
            "examples": ["Breast", "Lung", "Prostate gland"]
          }
        },
        {
          "name": "age_at_diagnosis",
          "description": "Age of the donor at the time of diagnosis in years",
          "valueType": "integer",
          "restrictions": {
            "required": true,
            "range": {"min": 0, "max": 120}
          },
          "meta": {
            "displayName": "Age at Diagnosis",
            "units": "years"
          }
        },
        {
          "name": "cancer_type",
          "description": "Type of cancer diagnosed using ICD-O-3 topography codes",
          "valueType": "string",
          "restrictions": {
            "required": true,
            "regex": "^C[0-9]{2}(\\.[0-9])?$"
          },
          "meta": {
            "displayName": "Cancer Type",
            "examples": ["C50.1", "C34.1", "C61"]
          }
        },
        {
          "name": "staging_system",
          "description": "Staging system used for cancer classification",
          "valueType": "string",
          "restrictions": {
            "required": true
          },
          "meta": {
            "displayName": "Staging System",
            "examples": ["AJCC 8th edition", "FIGO staging system", "Gleason grade group system"]
          }
        },
        {
          "name": "stage",
          "description": "Stage of cancer according to the specified staging system",
          "valueType": "string",
          "restrictions": {
            "required": true
          },
          "meta": {
            "displayName": "Stage",
            "examples": ["Stage I", "Stage IV", "Grade Group 2"]
          }
        }
      ],
      "restrictions": {
        "primaryKey": ["diagnosis_id"],
        "foreignKey": [
          {
            "schema": "donor",
            "mappings": [{ "local": "donor_id", "foreign": "donor_id" }]
          }
        ]
      },
      "meta": {
        "createdAt": "2025-03-20T16:11:06.491Z",
        "sourceFile": "diagnosis.csv"
      }
    },
    {
      "name": "treatment",
      "description": "Treatment information linked to a donor and diagnosis. Each treatment belongs to exactly one donor.",
      "fields": [
        {
          "name": "donor_id",
          "description": "Reference to the donor receiving this treatment",
          "valueType": "string",
          "restrictions": {
            "required": true,
            "regex": "^DO\\d{4}$"
          },
          "meta": {
            "displayName": "Donor ID",
            "examples": ["DO0599", "DO0600"]
          }
        },
        {
          "name": "treatment_id",
          "description": "Unique identifier for a treatment record",
          "valueType": "string",
          "restrictions": {
            "required": true,
            "unique": true,
            "regex": "^TR\\d{6}$"
          },
          "meta": {
            "displayName": "Treatment ID",
            "examples": ["TR059901", "TR059902"]
          }
        },
        {
          "name": "treatment_type",
          "description": "Type of treatment administered",
          "valueType": "string",
          "restrictions": {
            "required": true,
            "codeList": [
              {"code": "Surgery", "description": "Surgical procedure"},
              {"code": "Radiation therapy", "description": "Radiation therapy"},
              {"code": "Chemotherapy", "description": "Chemical treatment"},
              {"code": "Hormonal therapy", "description": "Hormone-based therapy"}
            ]
          },
          "meta": {
            "displayName": "Treatment Type"
          }
        },
        {
          "name": "treatment_start",
          "description": "Days since diagnosis when treatment started",
          "valueType": "integer",
          "restrictions": {
            "required": true,
            "range": {"min": 0}
          },
          "meta": {
            "displayName": "Treatment Start",
            "units": "days"
          }
        },
        {
          "name": "treatment_duration",
          "description": "Duration of the treatment in days",
          "valueType": "integer",
          "restrictions": {
            "required": true,
            "range": {"min": 1}
          },
          "meta": {
            "displayName": "Treatment Duration",
            "units": "days"
          }
        },
        {
          "name": "treatment_response",
          "description": "Response to the treatment",
          "valueType": "string",
          "restrictions": {
            "required": true,
            "codeList": [
              {"code": "Complete response", "description": "Complete disappearance of disease"},
              {"code": "Partial response", "description": "Reduction in disease burden"},
              {"code": "Disease progression", "description": "Increase in disease burden"}
            ]
          },
          "meta": {
            "displayName": "Treatment Response"
          }
        }
      ],
      "restrictions": {
        "primaryKey": ["treatment_id"],
        "foreignKey": [
          {
            "schema": "donor",
            "mappings": [{ "local": "donor_id", "foreign": "donor_id" }]
          }
        ]
      },
      "meta": {
        "createdAt": "2025-03-20T16:11:06.495Z",
        "sourceFile": "treatment.csv"
      }
    },
    {
      "name": "followup",
      "description": "Follow-up assessment information linked to treatments and donors. Each followup is associated with exactly one treatment.",
      "fields": [
        {
          "name": "treatment_id",
          "description": "Reference to the treatment this followup is associated with",
          "valueType": "string",
          "restrictions": {
            "required": true,
            "regex": "^TR\\d{6}$"
          },
          "meta": {
            "displayName": "Treatment ID",
            "examples": ["TR059901", "TR059902"]
          }
        },
        {
          "name": "followup_id",
          "description": "Unique identifier for a followup record",
          "valueType": "string",
          "restrictions": {
            "required": true,
            "unique": true,
            "regex": "^FO\\d{6}$"
          },
          "meta": {
            "displayName": "Followup ID",
            "examples": ["FO059901", "FO059902"]
          }
        },
        {
          "name": "followup_interval",
          "description": "Time since treatment completion in days",
          "valueType": "integer",
          "restrictions": {
            "required": true,
            "range": {"min": 0}
          },
          "meta": {
            "displayName": "Followup Interval",
            "units": "days"
          }
        },
        {
          "name": "disease_status",
          "description": "Status of the disease at followup",
          "valueType": "string",
          "restrictions": {
            "required": true,
            "codeList": [
              {"code": "No evidence of disease", "description": "No clinical evidence of disease"},
              {"code": "Complete remission", "description": "Complete disappearance of all signs of cancer"},
              {"code": "Stable", "description": "Cancer is neither decreasing nor increasing"},
              {"code": "Progression NOS", "description": "Disease has worsened"}
            ]
          },
          "meta": {
            "displayName": "Disease Status"
          }
        }
      ],
      "restrictions": {
        "primaryKey": ["followup_id"],
        "foreignKey": [
          {
            "schema": "treatment",
            "mappings": [{ "local": "treatment_id", "foreign": "treatment_id" }]
          }
        ]
      },
      "meta": {
        "createdAt": "2025-03-20T16:11:06.494Z",
        "sourceFile": "followup.csv"
      }
    }
  ]
}
```

</details>

## Step 3: Upload the Dictionary to Lectern

```bash
conductor lecternUpload -s ./configs/lecternDictionaries/dictionary.json -u http://localhost:3031
```

<details>
<summary>Command Breakdown</summary>

Lectern Upload Command:

- `-s`, `--schema-file` <path> Schema JSON file to upload (required)
- `-u`, `--lectern-url` <url> Lectern server URL (default: http://localhost:3031)
- `-t`, `--auth-token` <token> Authentication token (optional)
- `-o`, `--output` <path> Output directory for logs

Example: `conductor lecternUpload -s data-dictionary.json`

This step uploads the dictionary to Lectern.

</details>

## Step 4: Register the Lectern Dictionary with Lyric

Register your updated dictionary with Lyric:

```bash
conductor lyricRegister -c clinical-cancer --dict-name example-dictionary -v 1.0 -e donor
```

<details>
<summary>Command Breakdown</summary>

Lyric Register Dictionary Command:

- `-u`, `--lyric-url` <url> Lyric server URL (default: http://localhost:3030)
- `-c`, `--category-name` <name> The category name that will correspond to this dictionary
- `--dict-name` <name> Dictionary name
- `-v`, `--dictionary-version` <version> Dictionary version
- `-e`, `--default-centric-entity` <entity> Default centric entity (default: clinical_data)

Example: `conductor lyricRegister -c my-category --dict-name my-dictionary -v 2.0`

This step updates the dictionary with Lyric, preparing it for data submission and validation.

</details>

## Step 5: Upload Data to Lyric

To upload the data files:

```bash
conductor lyricUpload -d ./data/segmentedData/-c clinical-cancer -g OICR
```

> **Note:** Lyric requires CSV files to be named exactly after the schema they correspond to in the Lectern dictionary. For example, if there's a schema named "patient" in the Lectern dictionary, your CSV file must be named patient.csv.

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

</details>

## Additional Resources

- [Lectern Documentation](https://docs.overture.bio/docs/core-software/Lectern/overview)
- [Lyric Documentation](https://docs.overture.bio/docs/core-software/Lyric/overview/)
- [Maestro Documentation](https://docs.overture.bio/docs/core-software/Maestro/overview)

Support & Contributions

For support, feature requests, and bug reports, please see our [Support Guide](/support).

For detailed information on how to contribute to this project, please see our Contributing Guide.
