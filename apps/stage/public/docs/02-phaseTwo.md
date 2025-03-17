# Phase Two

## Overview

**In this guide we will** extend our data management capabilities by implementing data submission validation, storage, and publication processes.

**By the end of this guide you will be able to:**

1. Manage data submission validation using the Lectern dictionary schema manager
2. Complete a full data submission workflow with Lyric
3. Index validated data with Maestro
4. View the indexed data from the front-end UI configured in Phase One

## Prerequisites and Requirements

**You will need:**

- Completed Phase One configuration including:
  - Updated docker-compose.yml
  - Index mapping templates
  - Arranger configuration files
- A basic understanding of the following Overture services:
  - [Lectern](https://docs.overture.bio/docs/core-software/Lectern/overview)
  - [Lyric](https://docs.overture.bio/docs/core-software/Lyric/overview/)
  - [Maestro](https://docs.overture.bio/docs/core-software/Maestro/overview)
- Your data table file(s) from Phase One, which may be divided into multiple schemas if necessary

## Background Information

Phase Two focuses on establishing a data submission and management workflow. This phase introduces tools to validate, store, and publish data while maintaining data integrity and consistency across your platform. If necessary, the data file you made for Phase One will be divided into multiple segments represented as schemas to support distributed data collection.

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

### Preparing Your Clinical Data

Depending on your data requirements, you may need to separate your data into multiple distinct schemas to support a distributed submission process where different teams contribute different aspects of information.

**Example: Clinical Data Schema Division**

As an example, we've separated our clinical cancer dataset from phase one's `dataTable1.csv` into five logical csv's:

1. **Donor CSV:**

- Owner: Registration Team
- Contains: Basic demographic information
- Primary identifiers for study participants

2. **Diagnosis CSV:**

- Owner: Diagnostic Team
- Contains: Condition details and references to donors
- Links to donor records

3. **Specimen CSV:**

- Owner: Laboratory Team
- Contains: Sample information linked to diagnoses
- References diagnosis records

4. **Treatment CSV:**

- Owner: Treatment Team
- Contains: Intervention details linked to diagnoses
- Records therapies and responses

5. **Follow-up CSV:**

- Owner: Follow-up Team
- Contains: Outcome information linked to diagnoses
- Tracks long-term status

Each file will correspond to a specific schema in the Lectern dictionary we will generate in the next step. This will ensure data integrity and structure are maintained across submissions from multiple teams. You should analyze your own data requirements to determine if a similar division would be beneficial. Otherwise, you may proceed with one scheme to represent your original data structure.

### Generate the Dictionary

1. Run the Composer command to generate a Lectern dictionary for all five schemas:

   ```bash
   composer -p generateLecternDictionary -f ./data/segmentedData/ -n clinical-cancer-data -v 1.0
   ```

   <details>
   <summary>Command Breakdown</summary>

   In this command:

   - `-p generateLecternDictionary`: Specifies the operation to generate a Lectern dictionary
   - `-f donor.csv diagnosis.csv specimen.csv treatment.csv followup.csv`: Specifies all five clinical data files to analyze
   - `-n clinical-cancer-data`: Names the dictionary
   - `-v 1.0`: Sets the dictionary version
   - Additional options include:
     - `-o, --output <path>`: Output file path for generated dictionary
     - `--delimiter <char>`: CSV delimiter

   The command analyzes the structure of input CSV files and creates a comprehensive data dictionary that defines the structure, constraints, and metadata for your clinical datasets.
   </details>

2. Validate the generated dictionary:
   - Review the dictionary structure to ensure it correctly captures all five schemas
   - Confirm all required fields are present
   - Check data types and constraints, especially for clinical terms and IDs
   - Ensure proper references between schemas (e.g., diagnosis_id in specimen.csv references diagnosis.csv)

### Upload the Dictionary

1. Upload the dictionary to Lectern:

   ```bash
   conductor lecternUpload -s clinical-cancer-dictionary.json
   ```

   <details>
   <summary>Command Breakdown</summary>

   In this command:

   - `-s, --schema-file <path>`: Specifies the dictionary JSON file to upload
   - Additional options include:
     - `-u, --lectern-url <url>`: Lectern server URL
     - `-t, --auth-token <token>`: Authentication token
     - `-o, --output <path>`: Output directory for logs

   This step registers your clinical data dictionary with the Lectern service, enabling validation and management of data submissions from various clinical teams.
   </details>

## Step 2: Register Dictionary with Lyric

1. Register the dictionary in Lyric:

   ```bash
   conductor lyricRegister -c clinical-cancer -n clinical-cancer-data -v 1.0 -e donor
   ```

   <details>
   <summary>Command Breakdown</summary>

   In this command:

   - `-u, --lyric-url <url>`: Lyric server URL
   - `-c, --category-name clinical-cancer`: Category name for the dictionary
   - `-n, --dict-name clinical-cancer-data`: Name of the dictionary
   - `-v, --dictionary-version 1.0`: Dictionary version
   - `-e, --default-centric-entity donor`: Default centric entity (patient-centric approach)

   This step integrates the dictionary with Lyric, preparing it for clinical data submission and validation.
   </details>

## Step 3: Configure Submission Sequence

Since our clinical data involves multiple related schemas, it's important to configure the submission sequence to maintain data integrity:

1. Configure submission sequence in Lyric:

   ```bash
   conductor lyricSequence -c clinical-cancer -s "donor,diagnosis,specimen,treatment,followup"
   ```

   <details>
   <summary>Command Breakdown</summary>

   In this command:

   - `-c, --category-id clinical-cancer`: Category ID
   - `-s, --sequence "donor,diagnosis,specimen,treatment,followup"`: The order in which schemas should be validated and processed

   This ensures that parent records (donors) are validated before child records (diagnoses, specimens, etc.).
   </details>

## Step 4: Upload Data to Lyric

1. Upload donor data first:

   ```bash
   conductor lyricData -d ./donor-directory -c clinical-cancer -g cancer-center
   ```

2. After donor validation succeeds, upload diagnosis data:

   ```bash
   conductor lyricData -d ./diagnosis-directory -c clinical-cancer -g cancer-center
   ```

3. Continue with remaining schemas in order:

   ```bash
   conductor lyricData -d ./specimen-directory -c clinical-cancer -g cancer-center
   conductor lyricData -d ./treatment-directory -c clinical-cancer -g cancer-center
   conductor lyricData -d ./followup-directory -c clinical-cancer -g cancer-center
   ```

   <details>
   <summary>Command Breakdown</summary>

   In these commands:

   - `-u, --lyric-url <url>`: Lyric server URL
   - `-l, --lectern-url <url>`: Lectern server URL
   - `-d, --data-directory <path>`: Directory containing the specific CSV data file
   - `-c, --category-id clinical-cancer`: Category ID
   - `-g, --organization cancer-center`: Organization name
   - `-m, --max-retries <number>`: Maximum retry attempts

   This sequential upload ensures that each clinical team's data is properly validated against the previously registered dictionary and dependent records exist.
   </details>

## Step 5: Configure Maestro for Clinical Data

1. Setup Maestro indexing rules for clinical data:

   ```bash
   conductor maestroRules -c clinical-cancer -e donor -r "diagnosis,specimen,treatment,followup"
   ```

   <details>
   <summary>Command Breakdown</summary>

   In this command:

   - `-c, --category clinical-cancer`: Category name
   - `-e, --entity donor`: Primary entity (creates donor-centric index)
   - `-r, --related "diagnosis,specimen,treatment,followup"`: Related entities to include

   This configures Maestro to create donor-centric indexes with nested related entities, enabling comprehensive patient views in the UI.
   </details>

## Validation

After completing these steps, verify:

- Dictionary is successfully uploaded to Lectern and includes all five clinical schemas
- Dictionary is registered in Lyric
- Data files from all clinical teams pass validation
- References between schemas (e.g., donor_id in diagnosis, diagnosis_id in treatment) are maintained
- Data is correctly indexed in Maestro with proper relationships

## Troubleshooting

Common issues and solutions:

- Dictionary validation failures: Check field types and constraints match the clinical data
- ID reference errors: Ensure diagnosis_ids in specimen, treatment, and followup files match existing diagnosis records
- Data type mismatches: Verify formats for clinical codes, dates, and numeric values
- Missing required fields: Ensure all mandatory clinical fields are populated
- Connectivity problems with Lyric or Lectern

## Next Steps

With your clinical data submitted and validated, you are now ready to:

- View comprehensive patient data in the Stage UI
- Perform clinical cohort analysis
- Generate reports on treatment outcomes
- Expand your clinical data management workflow

## Additional Resources

- [Lectern Documentation](https://docs.overture.bio/docs/core-software/Lectern/overview)
- [Lyric Documentation](https://docs.overture.bio/docs/core-software/Lyric/overview/)
- [Maestro Documentation](https://docs.overture.bio/docs/core-software/Maestro/overview)
