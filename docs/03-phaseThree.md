# PhaseTwo

## Overview

Here we focus on implementing our back-end file management services which will
include the addition of Song, Score, SongDb (Postgres) and an Object Storage
provider (Minio).

![Image Title](/docs/images/phaseThree.png "PhaseThree Architecture Diagram")

| Added Software                                                           | Description                                                                                      |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| [Score](https://docs.overture.bio/docs/core-software/Score/overview)     | Transfer file data to and from any S3 object storage                                             |
| [Song](https://docs.overture.bio/docs/core-software/song/overview/)      | Catalog and manage metadata associated to file data                                              |
| [Maestro](https://docs.overture.bio/docs/core-software/Maestro/overview) | Organizes distributed data into a centralized Elasticsearch index, automatically, on publication |
| SongDB (Postgres)                                                        | Database used by Song to store metadata and manage file information                              |
| Minio                                                                    | Open source S3-compatible object storage used locally for development and testing                |

## Configuring Songs Data Model

This guide provides an overview of the steps required to configure Song for your
desired data model. For comprehensive instructions and examples, refer to our
[full documentation](https://docs.overture.bio/guides/administration-guides/updating-the-data-model).

### 1. Understanding Schema Structure & Base Schema Requirements

Before creating your custom schema, it's essential to understand Song's base
schema requirements. Any schema you create will be merged with these base
requirements, so understanding them is crucial for successful implementation.

#### Base Schema Overview

Song's
[base schema](https://github.com/overture-stack/SONG/blob/develop/song-server/src/main/resources/schemas/analysis/analysisBase.json)
defines the fundamental structure required for all data submissions. Your custom
schema will need to work alongside these requirements.

#### Required Field Structure

The base schema enforces the following hierarchy:

- Each submission must have a study ID and analysis type
- Each submission must include at least one sample
- Each sample must have one specimen and one donor
- Each submission must include at least one file

#### Mandatory Fields Reference

Below is a comprehensive list of all required fields that must be included in
every submission:

| Field Path                                 | Type        | Constraints/Enums                                                                                                                         |
| ------------------------------------------ | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| studyId                                    | string      | minLength: 1                                                                                                                              |
| analysisType.name                          | string      | -                                                                                                                                         |
| samples (array)                            | array       | minItems: 1                                                                                                                               |
| samples[].submitterSampleId                | string      | pattern: ^[A-Za-z0-9\-\._]{1,64}$                                                                                                         |
| samples[].sampleType                       | string      | enum: ["Total DNA", "Amplified DNA", "ctDNA", "Other DNA enrichments", "Total RNA", "Ribo-Zero RNA", "polyA+ RNA", "Other RNA fractions"] |
| samples[].specimen.submitterSpecimenId     | string      | pattern: ^[A-Za-z0-9\-\._]{1,64}$                                                                                                         |
| samples[].specimen.specimenTissueSource    | string      | enum (25+ values including "Blood derived", "Solid tissue", etc.)                                                                         |
| samples[].specimen.tumourNormalDesignation | string      | enum: ["Normal", "Tumour"]                                                                                                                |
| samples[].specimen.specimenType            | string      | enum (18+ values including "Normal", "Primary tumour", etc.)                                                                              |
| samples[].donor.submitterDonorId           | string      | pattern: ^[A-Za-z0-9\-\._]{1,64}$                                                                                                         |
| samples[].donor.gender                     | string      | enum: ["Male", "Female", "Other"]                                                                                                         |
| samples[].matchedNormalSubmitterSampleId   | string/null | Required if specimen.tumourNormalDesignation is "Tumour"                                                                                  |
| files (array)                              | array       | minItems: 1                                                                                                                               |
| files[].dataType                           | string      | -                                                                                                                                         |
| files[].fileName                           | string      | pattern: ^[A-Za-z0-9_\.\-\[\]\(\)]+$                                                                                                      |
| files[].fileSize                           | integer     | min: 0                                                                                                                                    |
| files[].fileType                           | string      | -                                                                                                                                         |
| files[].fileAccess                         | string      | enum: ["open", "controlled"]                                                                                                              |
| files[].fileMd5sum                         | string      | pattern: ^[a-fA-F0-9]{32}$                                                                                                                |

#### Important Considerations

When working with the base schema, keep in mind:

1. **Sample Requirements**

   - Each sample must have exactly one specimen and one donor
   - All IDs must follow the specified pattern: alphanumeric characters,
     hyphens, underscores, and periods only

2. **Conditional Logic**

   - The matchedNormalSubmitterSampleId field has specific requirements based on
     the tumourNormalDesignation:
     - For "Tumour" specimens: Must be included and can be either null or a
       valid submitterId
     - For "Normal" specimens: Must be included and must be null

3. **Optional Fields**

   - Info objects (sample.info, specimen.info, donor.info, files[].info) are
     optional
   - The analysisId field is explicitly forbidden in submissions

4. **Validation Patterns**
   - All submitter IDs must match the pattern: ^[A-Za-z0-9\-\._]{1,64}$
   - File names must match the pattern: ^[A-Za-z0-9_\.\-\[\]\(\)]+$
   - MD5 checksums must be 32 characters of hexadecimal

### 2. Create and update your Schema to Song

1. **Build Your Schema**

- Define schema name and properties
- Specify required fields
- Set up validation rules
- Configure data constraints
- [Full documentation: Building Schemas](https://docs.overture.bio/guides/administration-guides/updating-the-data-model#building-schemas)

2. **Update Song with your Schema(s)** Choose one of two methods:

   - Using Swagger UI

     - [Full documentation: Updating Song schema using the Swagger UI](https://docs.overture.bio/guides/administration-guides/updating-the-data-model#using-the-swagger-ui)

   - Using curl Commands

     - [Full documentation: Updating Song schema using a curl Command](https://docs.overture.bio/guides/administration-guides/updating-the-data-model#using-the-curl-command)

### Additional Resources

- [Complete Song Data Model Documentation](https://docs.overture.bio/guides/administration-guides/updating-the-data-model)
- [JSON Schema Guide](https://json-schema.org/understanding-json-schema)
  (external)
- [Example Schemas](https://raw.githubusercontent.com/cancogen-virus-seq/metadata-schemas/main/schemas/consensus_sequence.json)
- [Song Base Schema Reference](https://github.com/overture-stack/SONG/blob/develop/song-server/src/main/resources/schemas/analysis/analysisBase.json)

### Submit your data

### 3. Submitting your Data

The submission process involves:

1. Setting up the clients
2. Submitting metadata to Song
3. Generating a manifest
4. Uploading files with Score
5. Publishing the analysis

#### Setting Up the Clients

1. **Run the Song Client**

```bash
docker run -d -it --name song-client \
-e CLIENT_ACCESS_TOKEN=68fb42b4-f1ed-4e8c-beab-3724b99fe528 \
-e CLIENT_STUDY_ID=demo \
-e CLIENT_SERVER_URL=http://localhost:8080 \
--network="host" \
--platform="linux/amd64" \
--mount type=bind,source=./dataSubmission,target=/output \
ghcr.io/overture-stack/song-client:5.1.1
```

2. **Run the Score Client**

```bash
docker run -d -it --name score-client \
    -e ACCESSTOKEN=68fb42b4-f1ed-4e8c-beab-3724b99fe528 \
    -e STORAGE_URL=http://localhost:8087 \
    -e METADATA_URL=http://localhost:8080 \
    --network="host" \
    --platform="linux/amd64" \
    --mount type=bind,source=./dataSubmission,target=/output \
    ghcr.io/overture-stack/score:latest
```

#### Step 1: Submit Metadata to Song

1. **Prepare Your Metadata**

   - Create a JSON file containing your metadata according to the schema
     requirements
   - Ensure all required fields are present and correctly formatted
   - If you need to reference the schema it can be viewed using the GET /schemas
     endpoint

2. **Submit the Metadata**

```bash
docker exec song-client sh -c "sing submit -f /output/your-metadata.json"
```

3. **Handle Validation Errors** If you receive schema validation errors:
   - Review the error messages
   - Update your metadata file to address the issues
   - Resubmit until successful
   - Note the `analysisId` returned upon successful submission

#### Step 2: Generate a Manifest

After successful metadata submission run:

```bash
docker exec song-client sh -c "sing manifest -a {AnalysisId} -f /output/manifest.txt -d /output/"
```

Replace `{AnalysisId}` with the ID received from the metadata submission.

#### Step 3: Upload Files with Score

Use the generated manifest to upload your files:

```bash
docker exec score-client sh -c "score-client upload --manifest /output/manifest.txt"
```

#### Step 4: Publish the Analysis

Once files are uploaded, publish the analysis:

```bash
docker exec song-client sh -c "sing publish -a {AnalysisId}"
```

#### Verification

After publishing:

1. Your data should be available in the front-end portal (typically at
   localhost:3000/explorer)
2. Verify that all files and metadata are correctly displayed
3. Check that the analysis status is "PUBLISHED"

For detailed instructions and troubleshooting, see the
[CLI Submission Guide](https://docs.overture.bio/guides/user-guides/cli-submissions).
