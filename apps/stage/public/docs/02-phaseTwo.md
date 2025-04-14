# Phase Two

## Overview

**This guide is for** those in phase two of Prelude's deployment process. Here we will add our backend data submission and storage services.

**By the end of this guide you will be able to:**

1. Validate data submissions using the Lectern dictionary schema manager
2. Complete an end-to-end data submission workflow with Lyric
3. Index validated data with Maestro
4. Access and view indexed data through the front-end UI configured in phase one

## Prerequisites

**You will need:**

- A basic understanding of the following:
  - [Lectern](https://docs.overture.bio/docs/under-development/Lectern/) - Dictionary schema management
  - [Lectern Dictionary Reference Documentation](https://github.com/overture-stack/lectern/blob/develop/docs/dictionary-reference.md)
  - [Lyric](https://docs.overture.bio/docs/under-development/Lyric/) - Submission workflow management
  - [Maestro](https://docs.overture.bio/docs/core-software/Maestro/overview) - Data indexing service

## Background Information

Phase Two establishes your back-end data submission and management workflow. This phase introduces tools to validate, store, and publish data helping maintain data integrity and consistency across your platform.

### Architecture Overview

The phase two architecture adds and focuses on the components highlighted in purple/pink in the image below:

![Phase 2 Architecture](/docs/images/phase2.png "Phase 2 Architecture")

| Component                                                                    | Purpose                                                               |
| ---------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| **[Lectern](https://docs.overture.bio/docs/under-development/Lectern/)**     | Dictionary schema manager that defines and validates data structures  |
| **[Lyric](https://docs.overture.bio/docs/under-development/Lyric/)**         | Submission management system for data validation and workflow control |
| **[Maestro](https://docs.overture.bio/docs/core-software/Maestro/overview)** | Data indexing and storage service for submitted data                  |

## Step 1: Deploy Phase 2 Services

1. Run the deployment command:

   ```bash
   make phase2
   ```

The deployment script (`apps/conductor/scripts/deployment/phase2.sh`) will automatically verify that all services are running correctly. Check the container logs if any service fails to start properly

## Step 2: Set Up Data Dictionary

In phase one, we represented our data as a flat file where each row represented a single entity. However, real-world data often involves complex relationships between entities. For example, a single donor can have multiple diagnoses, and this one-to-many relationship cannot be properly stored in a flat structure without causing data duplication or information loss.

When dealing with nested or hierarchical data structures, a relational approach using multiple schemas becomes necessary to accurately represent these relationships.

### A) Prepare Your Tabular Data

Depending on your data complexity you will need to organize information into multiple related schemas that can be properly linked. For this we will use Lectern, Overture's schema dictionary manager.

**Example: Clinical Data Schema Division**

For demonstration purposes, we've separated our clinical cancer dataset from phase one's example `dataTable1.csv` into four logical files:

![Entity Relationship](/docs/images/entityRelationshipDiagram.png "Entity Relationship Diagram")

> **Making ER diagrams:** The diagram above was created using https://dbdiagram.io/.

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

### B) Generate the Dictionary

Once we have established our data structure and organized our files, we can proceed with creating our Lectern dictionary schema.

1. To generate a base Lectern dictionary schema from multiple segmented data files, run:

   ```bash
   composer -p LecternDictionary -f ./data/segmentedData/ -n example-dictionary -v 1.0 -o ./configs/lecternDictionaries/
   ```

2. For a single data file, you can point to your flat file:

   ```bash
   composer -p LecternDictionary -f ./data/dataTable1.csv -n dataTableOneDictionary -v 1.0 -o ./configs/lecternDictionaries/
   ```

   <details>
   <summary>Command Breakdown</summary>

   In this command:

   - `-p LecternDictionary`: Specifies the operation to generate a Lectern dictionary
   - `-f ./data/segmentedData/`: Specifies the directory (or file) containing our segmented data files
   - `-n example-dictionary`: Names the dictionary
   - `-v 1.0`: Sets the dictionary version
   - `-o ./configs/lecternDictionaries/`: Sets the output directory for the generated dictionary

   The command analyzes the structure of input CSV files and creates a base data Lectern dictionary defining the structure of the dataset. Each file will be represented as a schema, with the file name used as the schema name in the generated dictionary.
   </details>

### C) Review and Update the Lectern Dictionary

The generated dictionary provides a basic structure derived from your CSV files. We'll review and update each component to tailor data validation and establish entity relationships.

1.  **Dictionary Metadata:** We will first update our top-level dictionary metadata:

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

2.  **Schema Descriptions:** we will next update each schemas `name`, `description` and `meta` field with more detailed information:

    <details>
    <summary>Updated dictionary example</summary>

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

3.  **Field Definitions:** review and update the field definitions for each schema ensuring we are using the proper data types, validation rules, and are providing meaningful descriptions.

      <details>
      <summary>Updated dictionary example</summary>

    ```json
    "fields": [
      {
        "name": "donor_id",
        "description": "Unique identifier for a donor across the system",
        "valueType": "string",
        "unique": true,
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

    > **Required documentation for field definitions:** reference our [preliminary Lectern documentation found here](https://github.com/overture-stack/lectern/blob/develop/docs/dictionary-reference.md#dictionary-field-structure) when updating field definitions and Lectern validation rules

4.  **Entity Relationships:** the `foreignKey` restriction object defines relationships between different schemas in your Lectern dictionary:

  - In our example data `donor` schemas `donor_id` is the `primaryKey`

    ```json
        {
          "name": "donor",
          "description": "Core demographic information about donors. One donor can have multiple diagnoses, treatments, and followups.",
          "fields": [
          ...
          ],
          "restrictions": {
          "primaryKey": ["donor_id"]
          },
          "meta": {
            "createdAt": "2025-03-20T16:11:06.493Z",
            "sourceFile": "donor.csv"
          }
        },
    ```

- All other schemas will relate to the `donor` schema using the `donor_id` as the `local` and `foreignKey`:

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

    This constraint ensures that every value in the current schema's `donor_id` field must exist in the `donor_id` field of the donor schema. For example, you cannot add a diagnosis record with a donor ID that doesn't exist in the donor table.

    </details>

    <details>
    <summary>Updated dictionary example</summary>

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
          "createdAt": "2025-03-20T16:11:06.493Z",
          "sourceFile": "donor.csv"
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

5.  **Save your updated dictionary:** the Lectern dictionary is now properly configured with appropriate schemas, field definitions, and entity relationships that accurately represent our data model. In the next steps, we will update lectern with our dictionary and then use this dictionary to validate and process data submissions through Lyric and Maestro.

    <details>
    <summary>Completed dictionary example</summary>

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
              "unique": true,
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
              "name": "gender",
              "description": "Gender of the donor",
              "valueType": "string",
              "restrictions": {
                "required": true,
                "codeList": ["Male", "Female"]
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
                "codeList": ["Alive", "Deceased"]
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
            "sourceFile": "donor.csv"
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
              "unique": true,
              "restrictions": {
                "required": true,
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
              "unique": true,
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
              "name": "treatment_type",
              "description": "Type of treatment administered",
              "valueType": "string",
              "restrictions": {
                "required": true,
                "codeList": ["Surgery", "Radiation therapy", "Chemotherapy", "Hormonal therapy"]
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
                "codeList": ["Complete response", "Partial response", "Disease progression"]
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
              "unique": true,
              "restrictions": {
                "required": true,
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
                "codeList": ["No evidence of disease", "Complete remission", "Stable", "Progression NOS"]
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

Using conductor upload your dictionary to Lectern:

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
- `-e`, `--default-centric-entity` <entity> Default centric entity (Required)

Example: `conductor lyricRegister -c my-category --dict-name my-dictionary -v 2.0`

This step updates the dictionary with Lyric, preparing it for data submission and validation.

</details>

> **Note on centric entities:** the default centric entity defined by `-e` is the primary or central entity in your data model. We explicitly define our centric entity when registering a dictionary to ensure proper relationship mapping.

## Step 5: Submit Data to Lyric

To submit your data files run:

```bash
conductor lyricUpload -d ./data/segmentedData/ -c clinical-cancer -g OICR
```

  <details>
  <summary>Command Breakdown</summary>

In these commands:

- `-d, --data-directory <path>`: Path to the specific CSV data file(s)
- `-c, --category-id clinical-cancer`: Category ID for the submission as defined during dictionary registration
- `-g, --organization cancer-center`: Organization name submitting the data
- Additional options include:
  - `-u, --lyric-url <url>`: Lyric server URL
  - `-l, --lectern-url <url>`: Lectern server URL
  - `-m, --max-retries <number>`: Maximum retry attempts

</details>

> **Note on category IDs:** When making submissions to Lyric, category IDs must be provided as integers. If you're unsure of your category ID, you can retrieve by using the `GET /category` endpoint in the Lyric API.
> - Access this endpoint through the Swagger UI:
>    - From the documentation portal, select "API" from the dropdown menu
>    - Or navigate directly to http://localhost:3030/api-docs/#/Category/get_category
> 
> In a future update, Lyric will support accepting category names.

## Step 6: Indexing Data into Elasticsearch

Now that your data is validated and stored in Lyric, we'll use Maestro to index it into Elasticsearch, making it searchable through the portal:

```
conductor maestroIndex --repository-code lyric.overture
```

This command triggers Maestro to process all valid data from the Lyric repository and index it into the Elasticsearch instance, following the mappings defined in Phase One.

> **Note:** The `repository-code` parameter must match the value configured in your `docker-compose.yml` file under the Maestro service's environment variables (`MAESTRO_REPOSITORIES_0_CODE`). This code uniquely identifies the data source to Maestro.

After indexing completes, your data will be available for searching and visualization through the data exploration interface you configured in Phase One.

## Step 7 (May be required): Update Elasticsearch and Arranger configurations for hierarchical data

After data validation and indexing, you must ensure your Elasticsearch mapping accurately reflects your data structure, especially if you've transitioned from a flat representation of your data to a hierarchical one.

> **Note:** One of the goals of Prelude is to minimize tedious manual configurations as such this step will be targeted for automation and elimination in a future release.

### A) Generate Updated Elasticsearch Index Mappings

We will use [Elasticvue](https://elasticvue.com/) here to examine our indexed documents
  
1. Navigate to the "Indices" section and select your index of interest. 

![Elasticvue](/docs/images/elasticvue.png "Elasticsearch document viewer")

2. The search interface for that index will open. You should see elasticsearch documents populating the UI. If not make sure you have run the indexing command referenced above (`conductor maestroIndex --repository-code lyric.overture`).

3. Copy the JSON document data and save it to a file in your data directory (e.g., `./data/esDoc.json`).

![Elasticvue](/docs/images/esDoc.png "Elasticsearch document example")

4. Generate an updated Elasticsearch mapping using Composer:
   ```bash
   composer -p ElasticsearchMapping -f ./data/esDoc.json -i datatable1 -o ./configs/elasticsearchConfigs/datatable1-mapping.json --skip-metadata
   ```

   <details>
   <summary>Command Breakdown</summary>

   - `-p ElasticsearchMapping`: Specifies the operation to generate an Elasticsearch mapping
   - `-f ./data/esDoc.json`: Path to the saved document JSON
   - `-i datatable1`: Sets the index name prefix
   - `-o ./configs/elasticsearchConfigs/datatable1-mapping.json`: Output path for the mapping file
   - `--skip-metadata`: Excludes submission metadata fields from the mapping

   This command analyzes the document structure to create an appropriate Elasticsearch mapping.
   </details>

5. Review and modify the generated mapping file:
   - Verify the index pattern: `"index_patterns": ["datatable1-*"]`
   - Check the alias: `"datatable1_centric": {}`
   - Ensure field types are correctly set (e.g., numeric fields as `integer`, text fields as `keyword`)

### B) Generate Updated Arranger Configurations

Now that you have an updated Elasticsearch mapping, generate corresponding Arranger configuration files:

1. Run Composer to create Arranger configuration files:
   ```bash
   composer -p ArrangerConfigs -f ./configs/elasticsearchConfigs/datatable1-mapping.json -o ./configs/arrangerConfigs/datatable1/
   ```

2. Review the generated Arranger configuration files:
   - `base.json`: Update the `index` field to match your index alias (e.g., `"index": "datatable1_centric"`)
   - `extended.json`: Verify field names and update display names for better UI presentation
   - `table.json`: Adjust column visibility and sort settings as needed
   - `facets.json`: Configure which fields should appear as filters and in what order

   <details>
   <summary>Configuration File Descriptions</summary>

   - **base.json**: Core configuration connecting to your Elasticsearch index
   - **extended.json**: Controls how fields are displayed and labeled in the UI
   - **table.json**: Defines table column behavior and appearance
   - **facets.json**: Configures the filter panel and available search facets

   For detailed information on configuration options, refer to the [Arranger Components Documentation](https://docs.overture.bio/docs/core-software/Arranger/usage/arranger-components).
   </details>

### C) Apply Your Updated Configurations

After updating your configurations, you need to restart services and reindex your data:

1. Restart all services to apply the new configurations:
   ```bash
   make restart
   ```

2. Trigger Maestro to reindex the data with your updated mappings:
   ```bash
   conductor maestroIndex --repository-code lyric.overture
   ```

3. Verify that your data appears correctly in the Portal UI with proper relationships and field mappings.

This completes the configuration update process. Your data model should now properly represent the hierarchical structure established in previous steps.

> **Next Steps:** In Phase Three, you will add our file data submission and tracking system.

## Additional Resources

- [Lectern Documentation](https://docs.overture.bio/docs/core-software/Lectern/overview)
- [Lectern Dictionary Reference Documentation](https://github.com/overture-stack/lectern/blob/develop/docs/dictionary-reference)
- [Lyric Documentation](https://docs.overture.bio/docs/core-software/Lyric/overview/)
- [Maestro Documentation](https://docs.overture.bio/docs/core-software/Maestro/overview)

## Support & Contributions

For support, feature requests, and bug reports, please see our [Support Guide](/documentation/support).

For detailed information on how to contribute to this project, please see our [Contributing Guide](/documentation/contribution).

> **Next Steps:** In phase 3 we will add our backend file transfer (object storage) and file metadata management services.


