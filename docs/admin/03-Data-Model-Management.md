# Data Model Management

The metadata management services used here (Song) uses [JSON Schema](https://json-schema.org/) to define and validate the metadata stored in its database. This ensures required fields are present, values match the correct types, and content falls within acceptable ranges or sets.

## Analysis Types

Metadata is submitted to Song as **analyses**: collections of files paired with descriptive metadata records. Every submission must include an `analysisType` field that names the schema Song will validate the payload against.

Each analysis type schema has two layers:

**Base schema**: mandatory fields required by every analysis regardless of type, including donor, specimen, and sample identifiers. View the current base schema in the [Song repository](https://github.com/overture-stack/SONG/blob/develop/song-server/src/main/resources/schemas/analysis/analysisBase.json).

**Dynamic schema**: the project-specific portion configured by an administrator. At a minimum it must define an `analysis_type` name and an `experiment` object:

```json
{
  "name": "variant_calling_example",
  "schema": {
    "type": "object",
    "required": ["experiment"],
    "properties": {
      "experiment": {}
    }
  }
}
```

The `genomicVariants` schema used in this deployment is defined in `configs/songConfigs/genomicVariants.json` and provided below:

```json
{
  "name": "genomicVariants",
  "schema": {
    "type": "object",
    "properties": {
      "experiment": {
        "type": "object",
        "required": [
          "sex",
          "age_at_diagnosis",
          "vital_status",
          "diagnosis_date",
          "disease_stage",
          "primary_diagnosis",
          "treatment_type",
          "treatment_response"
        ],
        "properties": {
          "sex": {
            "type": "string",
            "enum": ["male", "female", "other", "unknown"]
          },
          "age_at_diagnosis": {
            "type": "integer",
            "minimum": 0,
            "maximum": 150
          },
          "vital_status": {
            "type": "string",
            "enum": ["alive", "deceased", "unknown"]
          },
          "diagnosis_date": {
            "type": "string"
          },
          "disease_stage": {
            "type": "string"
          },
          "primary_diagnosis": {
            "type": "string"
          },
          "treatment_type": {
            "type": "string"
          },
          "treatment_response": {
            "type": "string"
          }
        }
      }
    }
  }
}
```

The `experiment` block defines eight required clinical fields. All are required; Song will reject the payload if any are missing or fail their type constraints.

| Field                | Type    | Constraints                          | Description                                                          |
| -------------------- | ------- | ------------------------------------ | -------------------------------------------------------------------- |
| `sex`                | string  | `male`, `female`, `other`, `unknown` | Biological sex of the participant                                    |
| `age_at_diagnosis`   | integer | 0–150                                | Age in years at the time of diagnosis                                |
| `vital_status`       | string  | `alive`, `deceased`, `unknown`       | Current vital status of the participant                              |
| `diagnosis_date`     | string  | —                                    | Date of diagnosis. ISO 8601 format (`YYYY-MM-DD`) is recommended     |
| `disease_stage`      | string  | —                                    | Clinical disease stage at time of diagnosis (e.g. `Stage III`)       |
| `primary_diagnosis`  | string  | —                                    | Primary diagnosis term (e.g. `Breast Adenocarcinoma`)               |
| `treatment_type`     | string  | —                                    | Type of treatment received (e.g. `Radiation`, `Surgery`)             |
| `treatment_response` | string  | —                                    | Response to treatment (e.g. `Partial Response`, `Complete Response`) |

Fields typed `string` with no `enum` constraint accept any string value. Fields with an `enum` will cause Song to reject the payload if a value outside the allowed set is submitted. Integer fields with `minimum`/`maximum` will likewise fail validation if the value falls outside the defined range.

For full details on authoring and extending Song schemas see the [Song Schema Reference](./04-Song-Schema-Reference.md).

## Registering an Analysis Type

These steps apply when registering a new schema or updating an existing one.

### Via Swagger UI

1. Open Song's Swagger UI at `http://localhost:8080/swagger-ui.html`
2. Find the `POST /schemas` (**RegisterAnalysisType**) endpoint
3. Click **Try it out** and enter your auth token (`Bearer <token>`)
4. Paste your schema JSON into the request body and click **Execute**

To verify registration use the `GET /schemas` (**ListAnalysisTypes**) endpoint, or `GET /schemas/{name}` (**GetAnalysisTypeVersion**) for a specific schema.

### Via curl

```bash
curl -X POST "http://localhost:8080/schemas" \
  -H "Authorization: Bearer 68fb42b4-f1ed-4e8c-beab-3724b99fe528" \
  -H "Content-Type: application/json" \
  -d @configs/songConfigs/genomicVariants.json
```

## Schema Versioning

- A newly registered analysis type name is automatically assigned **version 1**.
- Re-registering under the same name auto-increments the version.
- Submitting `"analysisType": { "name": "genomicVariants" }` without a version always resolves to the latest version.
- To pin a submission to a specific version use `"analysisType": { "name": "genomicVariants", "version": 2 }`.

## Listing and Retrieving Schemas

**List all registered schemas:**

```bash
curl "http://localhost:8080/schemas?hideSchema=false&unrenderedOnly=true" \
  -H "Authorization: Bearer 68fb42b4-f1ed-4e8c-beab-3724b99fe528"
```

Set `unrenderedOnly=true` to return only the dynamic (admin-defined) portion, useful when editing and re-registering a schema.

**Retrieve a specific schema version:**

```bash
curl "http://localhost:8080/schemas/genomicVariants?version=1&unrenderedOnly=true" \
  -H "Authorization: Bearer 68fb42b4-f1ed-4e8c-beab-3724b99fe528"
```

Omit `version` to retrieve all registered versions of that schema.
