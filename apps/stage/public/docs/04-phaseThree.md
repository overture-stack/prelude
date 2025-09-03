# Phase Three

## Overview

**This guide is for** those in phase three of Prelude's deployment process. The primary goal is to implement file management capabilities by setting up Song and Score, which allow you to track, validate, and store genomic files and their associated metadata.

**By the end of this guide you will be able to:**

1. Define and configure file metadata schemas for Song
2. Upload and manage files using Score's object storage integration
3. Complete an end-to-end file submission and retrieval workflow

## Prerequisites and Requirements

**You will need:**

- Sample files to upload (BAM, FASTQ, VCF, or other research data files)
- It will help to have a basic understanding of the following Overture services:
  - [Song](https://docs.overture.bio/docs/core-software/Song/overview) - Metadata tracking service for files
  - [Score](https://docs.overture.bio/docs/core-software/Score/overview) - File transfer service for object storage
  - [Minio](https://min.io/) - Local object storage service (S3-compatible)

## Background Information

Phase Three introduces file management capabilities to your Overture platform. While Phases One and Two focused on tabular data, Phase Three extends the platform to handle large files like genomic sequences, images, and other research artifacts.

The Song and Score services work together to provide a complete file management solution:

- **Song** tracks metadata about your files (description, file type, checksums, etc.)
- **Score** handles the actual file transfer to and from object storage

This separation of concerns allows for efficient file handling with rich metadata capabilities.

### Architecture Overview

Phase Three adds file management components to the existing architecture:

![Phase 3 Architecture Diagram](/docs/images/phase3.png "Phase 3 Architecture Diagram")

> **Note:** Full integration between file metadata and tabular data from Phase Two will be included in a future update. For more information, see the footnotes section at the bottom of this page.

| Component                                                                | Purpose                                                         |
| ------------------------------------------------------------------------ | --------------------------------------------------------------- |
| **[Song](https://docs.overture.bio/docs/core-software/Song/overview)**   | Tracks and validates file metadata                              |
| **[Score](https://docs.overture.bio/docs/core-software/Score/overview)** | Manages secure file transfer to and from object storage         |
| **Minio**                                                                | S3-compatible object storage for files (local development only) |

## Step 1: Deploy Phase 3 Services

Let's start by deploying the Phase 3 services:

1. Run the deployment command:

   ```bash
   make phase3
   ```

2. Verify service health:

   The deployment script should automatically verify that all services are running correctly. You should see the following components running:

   - Song (file metadata service)
   - Score (file transfer service)
   - Minio (object storage)
   - SongDb (Postgres Db for Song Metadata)
   - All previously deployed services from Phases 1 and 2

## Step 2: Define Your File Metadata Structure

Before uploading files, we need to understand how file metadata is structured in Song.

### A) Understanding File Metadata Structure

Song uses a hierarchical model to organize file metadata:

1. **Study**: A top-level container for related data (e.g., a research project)
2. **Analysis**: A group of related files with common metadata
3. **File**: Individual file metadata (name, type, size, checksum)

This structure allows for flexible organization of files based on your research needs.

### B) Custom Analysis Schemas in Song

Song uses Analysis Schemas to validate submitted metadata. Let's understand how to create one:

#### Minimal Example

A minimal Analysis Schema contains just the required structure:

```json
{
  "name": "sequencing_experiment",
  "options": {},
  "schema": {
    "type": "object",
    "required": ["experiment"],
    "properties": {
      "experiment": {}
    }
  }
}
```

#### Schema Options

The `options` property defines extra validations for your analysis schema:

```json
"options": {
  "fileTypes": ["bam", "cram"],
  "externalValidations": [
    {
      "url": "http://localhost:8099/",
      "jsonPath": "experiment.someId"
    }
  ]
}
```

- **File Types**: Restrict which file types are allowed in this analysis

  ```json
  "fileTypes": ["bam", "cram"]
  ```

  Setting this to an empty array `[]` allows any file type.

- **External Validations**: Validate metadata against external services

  ```json
  "externalValidations": [
    {
      "url": "http://example.com/{study}/donor/{value}",
      "jsonPath": "experiment.donorId"
    }
  ]
  ```

  This example validates a donor ID against an external service. When submitting an analysis with `"donorId": "id01"` in a study called "ABC123", Song would send a validation request to `http://example.com/ABC123/donor/id01`.

  > **Note**: The URL may cause errors if it contains tokens matching the `{word}` format other than `{study}` and `{value}`

## Step 3: Prepare Your Files for Upload

Now prepare some mock files for testing our upload to Song and Score:

### A) Organize Your Files

1. Create a directory for your files:

   ```bash
   mkdir -p data/fileData/upload
   ```

2. Place your data files in this directory. Alternatively for testing, you can create a sample file:

   ```bash
   # Create a simple test file
   dd if=/dev/urandom of=data/fileData/upload/test_rg3.bam bs=1M count=10
   ```

   This command creates a 10MB random file. Note the file size (10MB = 10485760 bytes), as you'll need this for your metadata.

3. Calculate the MD5 checksum for each file:

   ```bash
   md5sum data/fileData/upload/test_rg3.bam > data/fileData/upload/test_rg3.bam.md5
   ```

   This step is critical for file integrity verification. Song will validate that the file you upload matches the checksum provided in your metadata.

The file size and MD5 checksum are both required in your actual metadata submission. When you create your metadata.json file for submission later, you'll need to include both the accurate file size and the MD5 checksum calculated here.

### B) Creating the File Metadata Template

Create a file metadata template that serves as an example to generate your Song schema. This is not a submission file, but rather a representative sample of your data structure:

```json
{
  "analysisType": {
    "name": "sequencing_experiment",
    "version": 1
  },
  "experiment": {
    "platform": "ILLUMINA",
    "instrumentModel": "HiSeq 2500",
    "libraryStrategy": "WGS",
    "sequencingCenter": "OICR"
  },
  "sample": {
    "submitterSampleId": "SA-123",
    "matchedNormalSubmitterSampleId": "SA-456",
    "sampleType": "DNA",
    "specimen": {
      "submitterSpecimenId": "SP-123",
      "specimenType": "Normal",
      "donor": {
        "submitterDonorId": "DO0599",
        "gender": "Male"
      }
    }
  },
  "files": [
    {
      "fileName": "test_rg3.bam",
      "fileSize": 133684363564,
      "fileType": "BAM",
      "fileMd5sum": "9a793e90d0d1e11301ea8da996446e59",
      "fileAccess": "controlled"
    }
  ]
}
```

This template will be used next with the `SongSchemad to create a validation schema. When creating this template, include field structures and examples that represent your typical data, as these will inform the validation rules in the generated schema.

## Step 4: Generate a Song Schema Using Composer

Now we'll use Composer to generate a Song schema that will validate metadata submissions:

```bash
composer -p SongSchema -f ./data/fileData/file-metadata.json -o ./configs/songSchemas/ -n sequencing_experiment --file-types bam cram
```

<details>
<summary>Command Breakdown</summary>

In this command:

- `-p SongSchema`: Specifies the operation to generate a Song schema
- `-f ./data/fileData/file-metadata.json`: Specifies the input metadata description file
- `-o ./configs/songSchemas/`: Output directory for the generated schema
- `-n sequencing_experiment`: Names the schema
- `--file-types bam cram`: Restricts the allowed file types to BAM and CRAM files

Additional options:

- You can add more file types by adding them to the list: `--file-types bam cram vcf fastq`
</details>

Review the generated schema in `./configs/songSchemas/sequencing_experiment.json` and customize as needed, particularly the `options` section to add external validations if required.

## Step 5: Create a Study and Register Schema

### A) Create a Study in Song

Before uploading files, you need to create a study in Song:

```bash
conductor songCreateStudy -i cancer-genomics -n "Cancer Genomics Research Study" -g "My Organization" --description "A study for cancer genomics data"
```

<details>
<summary>Command Breakdown</summary>

In this command:

- `-i cancer-genomics`: The study ID
- `-n "Cancer Genomics Research Study"`: The study name
- `-g "My Organization"`: The organization conducting the study
- `--description "A study for cancer genomics data"`: A description of the study
- Additional options:
  - `-u, --song-url <url>`: Song server URL (default: http://localhost:8080)
  - `-t, --auth-token <token>`: Authentication token (default: 123)
  - `--force`: Force creation even if study exists

This command creates a container study in Song where all your file metadata will be organized.

</details>

### B) Register Schema with Song

Now register your schema with Song:

```bash
conductor songUploadSchema -s ./configs/songSchemas/sequencing_experiment.json
```

<details>
<summary>Command Breakdown</summary>

In this command:

- `-s, --schema-file <path>`: Path to the schema file
- Additional options:
  - `-u, --song-url <url>`: Song server URL (default: http://localhost:8080)
  - `-t, --auth-token <token>`: Authentication token (default: 123)
  - `-o, --output <path>`: Output directory for logs

This command registers your schema with Song, enabling it to validate metadata submissions against this schema.

</details>

## Step 6: Upload Files Using Song and Score

We'll use the individual Song and Score commands to submit metadata, upload files, and publish the analysis:

### A) Create the Submission Metadata

Create a file called `analysis.json` in the `data/fileData/upload` directory:

```json
{
  "studyId": "cancer-genomics",
  "analysisType": {
    "name": "sequencing_experiment",
    "version": 1
  },
  "experiment": {
    "platform": "ILLUMINA",
    "instrumentModel": "HiSeq 2500",
    "libraryStrategy": "WGS",
    "sequencingCenter": "OICR"
  },
  "samples": [
    {
      "submitterSampleId": "SA-123",
      "matchedNormalSubmitterSampleId": "SA-456",
      "sampleType": "DNA",
      "specimen": {
        "submitterSpecimenId": "SP-123",
        "specimenType": "Normal",
        "donor": {
          "submitterDonorId": "DO0599",
          "gender": "Male"
        }
      }
    }
  ],
  "files": [
    {
      "fileName": "test_rg3.bam",
      "fileType": "BAM",
      "fileMd5sum": "REPLACE_WITH_ACTUAL_MD5",
      "fileAccess": "controlled"
    }
  ]
}
```

Replace `"REPLACE_WITH_ACTUAL_MD5"` with the actual MD5 checksum from the previous step.

### B) Step-by-Step Submission

You'll need to perform each step of the process separately:

1. **Submit the analysis metadata to Song**:

   ```bash
   conductor songSubmitAnalysis -a ./data/fileData/upload/analysis.json -i cancer-genomics
   ```

   <details>
   <summary>Command Breakdown</summary>

   In this command:

   - `-a, --analysis-file <path>`: Analysis JSON file to submit
   - `-i, --study-id <id>`: Study ID
   - Additional options:
     - `-u, --song-url <url>`: Song server URL (default: http://localhost:8080)
     - `--allow-duplicates`: Allow duplicate analysis submissions
     - `-t, --auth-token <token>`: Authentication token (default: 123)
     - `--force`: Force studyId from command line instead of from file
     </details>

   This command will return an analysis ID. Make sure to save it for the next steps.

2. **Upload the files to Score**:

   ```bash
   conductor scoreManifestUpload -a ANALYSIS_ID -d ./data/fileData/upload
   ```

   Replace `ANALYSIS_ID` with the ID from the previous step.

   <details>
   <summary>Command Breakdown</summary>

   In this command:

   - `-a, --analysis-id <id>`: Analysis ID from Song submission
   - `-d, --data-dir <path>`: Directory containing data files
   - Additional options:
     - `-o, --output-dir <path>`: Directory for manifest output (default: ./output)
     - `-m, --manifest-file <path>`: Path for manifest file
     - `-u, --song-url <url>`: Song server URL (default: http://localhost:8080)
     - `-s, --score-url <url>`: Score server URL (default: http://localhost:8087)
     - `-t, --auth-token <token>`: Authentication token (default: 123)
     </details>

3. **Publish the analysis**:

   ```bash
   conductor songPublishAnalysis -a ANALYSIS_ID -i cancer-genomics
   ```

   Replace `ANALYSIS_ID` with the same ID used in the upload step.

   <details>
   <summary>Command Breakdown</summary>

   In this command:

   - `-a, --analysis-id <id>`: Analysis ID to publish
   - `-i, --study-id <id>`: Study ID
   - Additional options:
     - `-u, --song-url <url>`: Song server URL (default: http://localhost:8080)
     - `-t, --auth-token <token>`: Authentication token (default: 123)
     - `--ignore-undefined-md5`: Ignore files with undefined MD5 checksums
     </details>

## Step 7: Verify and Access Your Files

### A) Verify Files in Song

Check that your files are properly registered in Song:

```bash
curl -X GET http://localhost:8080/studies/cancer-genomics/analysis/ANALYSIS_ID
```

Replace `ANALYSIS_ID` with your actual analysis ID.

You should see a JSON response with all the metadata about your analysis and files.

### B) Download Files Using Score

To download files that have been uploaded and published:

```bash
# Create a directory for your downloads
mkdir -p data/fileData/download

# Download the analysis files
conductor scoreManifestUpload -a ANALYSIS_ID -d ./data/fileData/download --download-only
```

Replace `ANALYSIS_ID` with your actual analysis ID.

<details>
<summary>Command Breakdown</summary>

In this command:

- `-a, --analysis-id <id>`: Analysis ID to download
- `-d, --data-dir <path>`: Directory to save downloaded files
- `--download-only`: Only download files, don't upload
- Additional options:
  - `-u, --song-url <url>`: Song server URL (default: http://localhost:8080)
  - `-s, --score-url <url>`: Score server URL (default: http://localhost:8087)
  - `-t, --auth-token <token>`: Authentication token (default: 123)

This command downloads all files associated with the specified analysis.

</details>

### C) Explore Files in Minio

You can also explore your uploaded files in the Minio object storage interface:

1. Open http://localhost:9001 in your browser
2. Login with:
   - Username: `minio`
   - Password: `minio123`
3. Navigate to the `score-data` bucket to see your uploaded files

## Step 8: Configure Stage for File Access (Optional)

To enable file access through the Stage portal:

1. Update Stage's configuration in your docker-compose.yml:

   ```yaml
   stage:
     environment:
       # Add file download configuration
       NEXT_PUBLIC_DOWNLOAD_ENABLED: "true"
       NEXT_PUBLIC_DOWNLOAD_URL: "http://localhost:8087/download"
       NEXT_PUBLIC_SONG_URL: "http://localhost:8080"
   ```

2. Restart Stage:

   ```bash
   docker-compose restart stage
   ```

3. Navigate to your data exploration page in Stage to see file download options

## Advanced Topics

### Linking Files to Clinical Data

> **Note:** Full integration between file metadata and tabular data from Phase Two will be included in a future update.

In future releases, you'll be able to create a comprehensive data model by linking your file metadata with clinical data from Phase Two. This will typically involve:

1. Using common identifiers (e.g., donor IDs, sample IDs) in both systems
2. Creating a Maestro configuration that indexes both clinical and file data
3. Building unified search experiences in Stage

For now, focus on configuring Song and Score correctly to establish your file management capabilities.

### Creating Complex File Schemas

For more complex research data, you may need to create more detailed schemas. Refer to the [Song Schema documentation](https://github.com/overture-stack/SONG/blob/develop/song-docs/schemas/example-schema.json) for advanced examples.

## Troubleshooting

### Common Issues and Solutions

1. **Metadata Validation Errors**

   If you encounter validation errors when submitting metadata:

   - Check that your metadata matches your schema definition
   - Ensure all required fields are provided
   - Verify the schema version matches what's registered in Song

2. **File Upload Failures**

   If file uploads fail:

   - Verify file checksums match what's declared in the metadata
   - Check permissions on the upload directory
   - Ensure Score can connect to the object storage

3. **File Download Issues**

   If downloads fail:

   - Check that the analysis is published
   - Verify Score configuration is correct
   - Ensure the output directory is writable

## Additional Resources

- [Song Documentation](https://docs.overture.bio/docs/core-software/Song/overview)
- [Score Documentation](https://docs.overture.bio/docs/core-software/Score/overview)
- [Minio Documentation](https://docs.min.io/)

For support, feature requests, and bug reports, please see our [Support Guide](/support).
