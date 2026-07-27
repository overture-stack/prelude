# Data Submission

Each donor's data is submitted as a single **analysis**, Song's term for a registered unit of metadata and associated files. To create an analysis, you author a **payload**: a JSON file describing the donor's clinical metadata and listing the genomic files to be uploaded. Submitting that payload to Song registers the analysis and returns an `analysisId` that ties together all subsequent steps.

The submission flow is:

1. **Submit payload** to Song (registers the analysis, returns analysisId)
2. **Upload files** to Score (4-step upload protocol per file)
3. **Publish analysis** in Song (triggers Kafka, then Maestro, then Elasticsearch)

Once published, files appear in the portal's data explorer.

## Payload Format

Each donor is represented by a JSON payload file. Sample payloads are located in `data/payloads/`. Below is the structure for donor `DO001`:

```json
{
  "studyId": "demo",
  "analysisType": { "name": "genomicVariants" },
  "samples": [
    {
      "submitterSampleId": "DO001-SA01",
      "matchedNormalSubmitterSampleId": null,
      "sampleType": "Total DNA",
      "specimen": {
        "submitterSpecimenId": "DO001-SP01",
        "tumourNormalDesignation": "Tumour",
        "specimenType": "Primary tumour",
        "specimenTissueSource": "Breast"
      },
      "donor": {
        "submitterDonorId": "DO001",
        "gender": "Female"
      }
    }
  ],
  "files": [
    {
      "fileName": "DO001.snv.vcf.gz",
      "fileSize": 0,
      "fileMd5sum": "00000000000000000000000000000000",
      "fileType": "VCF",
      "fileAccess": "open",
      "dataType": "SNV"
    },
    {
      "fileName": "DO001.indel.vcf.gz",
      "fileSize": 0,
      "fileMd5sum": "00000000000000000000000000000000",
      "fileType": "VCF",
      "fileAccess": "open",
      "dataType": "INDEL"
    },
    {
      "fileName": "DO001.cnv.txt.gz",
      "fileSize": 0,
      "fileMd5sum": "00000000000000000000000000000000",
      "fileType": "TXT",
      "fileAccess": "open",
      "dataType": "CNV"
    },
    {
      "fileName": "DO001.sv.vcf.gz",
      "fileSize": 0,
      "fileMd5sum": "00000000000000000000000000000000",
      "fileType": "VCF",
      "fileAccess": "open",
      "dataType": "SV"
    }
  ],
  "experiment": {
    "sex": "female",
    "age_at_diagnosis": 55,
    "vital_status": "alive",
    "diagnosis_date": "2021-03-15",
    "disease_stage": "Stage II",
    "primary_diagnosis": "Breast Adenocarcinoma",
    "treatment_type": "Surgery",
    "treatment_response": "Complete Response"
  }
}
```

:::note
`fileSize` and `fileMd5sum` are placeholder values in the committed payload files. The Song and Score clients compute the real values from disk before sending to Song; the payload files themselves are never modified.
:::

<details>
<summary><strong>What is an analysis type?</strong></summary>

In Song, every submitted analysis must declare an `analysisType`, a named, versioned JSON Schema that defines the shape and validation rules for that analysis's metadata.

When you submit a payload with `"analysisType": { "name": "genomicVariants" }`, Song looks up the registered schema for that name and validates the entire payload against it before accepting the submission.

Each analysis type schema has two layers:

- **Base schema**: required fields common to every analysis, such as donor, specimen, sample identifiers, and file details.
- **Dynamic schema**: the project-specific fields defined by an administrator. For this deployment, that is the `experiment` block containing clinical fields such as `disease_stage`, `primary_diagnosis`, and `treatment_type`.

The `genomicVariants` schema used in this deployment is defined in `configs/songConfigs/genomicVariants.json`. Song auto-increments a version number each time the schema is updated, so `"analysisType": { "name": "genomicVariants" }` always resolves to the latest registered version unless an explicit `version` is supplied.

For full details on registering and managing analysis type schemas see the [Data Model Management](../admin/03-Data-Model-Management.md) admin guide.

</details>

## Submitting Data

Submission uses the Song and Score Docker client containers directly. For full CLI details see the [Overture CLI Submission guide](https://docs.overture.bio/docs/use-docs/cli-submissions).

:::tip
`make submit` runs the full workflow inside a Docker container automatically. It is provided for convenience when running the demo platform and requires no additional setup beyond Docker and Make. For real data submission, follow the steps below.
:::

### 0. Verify the platform is running

MinIO, Score, and Song must all be up before starting the client containers:

```bash
docker compose ps minio score song
```

All three should show `Up` (or `healthy`). If any are missing, run `make platform` first.

:::info
The Docker network name is `overture-demo_platform-network`. Compose derives it from the project name set in `docker-compose.yml` (`name: overture-demo`). If you changed that name, run `docker network ls | grep platform` to confirm.
:::

### 1. Start the Song client container

```bash
docker run -d -it --name song-client \
  -e CLIENT_ACCESS_TOKEN="68fb42b4-f1ed-4e8c-beab-3724b99fe528" \
  -e CLIENT_STUDY_ID=demo \
  -e CLIENT_SERVER_URL=http://song:8080 \
  --network overture-demo_platform-network \
  --platform linux/amd64 \
  --mount type=bind,source="$(pwd)/data/payloads",target=/payloads \
  --mount type=bind,source="$(pwd)/data",target=/data \
  ghcr.io/overture-stack/song-client:5131f6f8
```

<details>
<summary><strong>Song client configuration reference</strong></summary>

**Environment variables**

| Variable              | Value                                  | Description                                                                                                                                                                                                                                                                                                           |
| --------------------- | -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CLIENT_ACCESS_TOKEN` | `68fb42b4-f1ed-4e8c-beab-3724b99fe528` | Bearer token included in the `Authorization` header of every request the Song client makes. Song validates this against its configured auth provider in production deployments. In this local deployment auth validation is disabled, so the value is accepted as-is and never checked against any identity provider. |
| `CLIENT_STUDY_ID`     | `demo`                                 | Identifies which study (project) the analysis will be registered under. Song is multi-tenant: all metadata, schemas, and analyses are scoped to a study. The study must already exist before submission; it is created by `make platform` during setup.                                                              |
| `CLIENT_SERVER_URL`   | `http://song:8080`                     | Base URL of the Song REST API. All `sing` commands (`submit`, `manifest`, `publish`) send requests to this address. Uses the internal Docker hostname `song` so the container can resolve it on `overture-demo_platform-network`.                                                                                    |

**Volume mounts**

| Mount                                 | Purpose                                                                                                                                                                                                                                        |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `$(pwd)/data/payloads` to `/payloads` | Makes your local payload JSON files available inside the container. The `sing submit -f /payloads/<file>.json` command reads from this path.                                                                                                  |
| `$(pwd)/data` to `/data`              | Required for the manifest step. `sing manifest` writes the manifest file to `/data/manifest.txt` and reads the files directory at `/data/files` to verify that every file listed in the payload exists on disk before generating the manifest. |

</details>

### 2. Start the Score client container

```bash
docker run -d -it --name score-client \
  -e ACCESSTOKEN="68fb42b4-f1ed-4e8c-beab-3724b99fe528" \
  -e STORAGE_URL=http://score:8087 \
  -e METADATA_URL=http://song:8080 \
  --network overture-demo_platform-network \
  --platform linux/amd64 \
  --mount type=bind,source="$(pwd)/data",target=/data \
  ghcr.io/overture-stack/score-client:ee758b91
```

<details>
<summary><strong>Score client configuration reference</strong></summary>

**Environment variables**

| Variable       | Value                                  | Description                                                                                                                                                                                                                                                                                                                                                                                              |
| -------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ACCESSTOKEN`  | `68fb42b4-f1ed-4e8c-beab-3724b99fe528` | Bearer token included in the `Authorization` header of every request Score makes. As with the Song client, auth validation is disabled in this local deployment so the value is accepted without being checked. In a production deployment this must be a valid token issued by the configured identity provider.                                                                                        |
| `STORAGE_URL`  | `http://score:8087`                    | Base URL of the Score REST API. Score handles the multipart upload protocol: initiating uploads, transferring file parts to MinIO, and finalising each transfer. Uses the internal Docker hostname so the container can resolve it on `overture-demo_platform-network`. Score also redirects the score-client directly to MinIO for the sentinel health check; both must be on the same network to resolve. |
| `METADATA_URL` | `http://song:8080`                     | Base URL of the Song REST API. Score contacts Song during upload to retrieve the registered object IDs for each file in the manifest and to confirm that the file metadata (size, MD5) matches what was declared at submission time before marking an upload as complete.                                                                                                                                |

**Volume mount**

| Mount                    | Purpose                                                                                                                                                                                                          |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `$(pwd)/data` to `/data` | Gives Score access to both the manifest file at `/data/manifest.txt` (written by the Song client in step 4) and the actual genomic files at `/data/files` that will be read and streamed to MinIO during upload. |

</details>

### 3. Submit metadata to Song

```bash
docker exec song-client sh -c \
  "sing submit -f /payloads/DO001.json"
```

A successful response returns an `analysisId`:

```json
{
  "analysisId": "a1b2c3d4-0000-0000-0000-000000000000",
  "status": "OK"
}
```

Validate the submission matches the schema using Song's Swagger UI at [http://localhost:8080/swagger-ui.html](http://localhost:8080/swagger-ui.html).

### 4. Generate a Song upload manifest

```bash
docker exec song-client sh -c \
  "sing manifest -a <analysisId> -f /data/manifest.txt -d /data/files"
```

:::note
Replace `<analysisId>` with the value returned in step 3.
:::

This creates `data/manifest.txt` linking the analysis to the file paths on disk.

### 5. Upload files via Score

```bash
docker exec score-client sh -c \
  "bin/score-client upload --manifest /data/manifest.txt"
```

Score handles the 4-step upload protocol (initiate, upload parts, verify, finalise) for each file.

### 6. Publish the analysis

```bash
docker exec song-client sh -c \
  "sing publish -a <analysisId>"
```

Publishing emits a Kafka event. Maestro picks it up within seconds and indexes the files into Elasticsearch. The portal shows the new records on the next refresh.

### 7. Clean up the client containers

```bash
docker rm -f song-client score-client
```

## Idempotency and Retries

If a submission fails mid-way, you can resume from the appropriate step rather than starting over:

| Analysis state                           | Behaviour                                                                        |
| ---------------------------------------- | -------------------------------------------------------------------------------- |
| Not yet submitted                        | Submit normally from step 3                                                      |
| `UNPUBLISHED` (upload previously failed) | Skip Song submission; re-run the Score upload (step 5) and then publish (step 6) |
| `PUBLISHED`                              | Nothing to do. The analysis is already indexed.                                  |
| `SUPPRESSED`                             | Run `make reset-song` to clear Song state, then resubmit from the beginning      |

## Automating Submission at Scale

The manual steps above work for small batches but become error-prone at scale: each donor requires payload authoring, sequential Song and Score calls, and per-file manifest generation. For larger cohorts, automating the workflow via shell scripting, Python, or a workflow manager such as Nextflow or Snakemake is strongly recommended.

The [PCGL Molecular Data Submission Workflow](https://github.com/Pan-Canadian-Genome-Library/molecular-data-submission-workflow) is a worked example of a Nextflow-based approach for a more complex project built on the same Song and Score stack.
