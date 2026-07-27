# Song Schema Reference

Song uses [JSON Schema](https://json-schema.org/) (draft-07) to define and enforce the structure of analysis metadata. This reference covers every property available when authoring a dynamic schema, with examples and validation behaviour for each.

For registration steps see [Data Model Management](./03-Data-Model-Management.md).

## Schema Envelope

Every schema submitted to Song is wrapped in an envelope that names it and contains the JSON Schema definition:

```json
{
  "name": "mySchema",
  "schema": {
    "type": "object",
    "required": ["experiment"],
    "properties": {
      "experiment": {}
    }
  }
}
```

**Envelope properties:**

| Property | Type   | Required | Description                                                                           |
| -------- | ------ | :------: | ------------------------------------------------------------------------------------- |
| `name`   | string |    ✓     | Unique name for the analysis type. Re-submitting the same name creates a new version. |
| `schema` | object |    ✓     | A valid JSON Schema object defining the dynamic fields for this analysis type.        |

Song merges this dynamic schema with its internal base schema (donor, specimen, sample, file fields) at validation time. You only define the project-specific portion.

## The `experiment` Object

By convention the dynamic schema defines a top-level `experiment` object that holds all project-specific clinical fields. This is not enforced by Song itself, any property name is valid, but it is the pattern used by all Overture deployments and expected by this demo's payload format.

```json
"schema": {
  "type": "object",
  "required": ["experiment"],
  "properties": {
    "experiment": {
      "type": "object",
      "required": ["field_a", "field_b"],
      "properties": {
        "field_a": { "type": "string" },
        "field_b": { "type": "integer" }
      }
    }
  }
}
```

## Field Types

### string

Accepts any UTF-8 string value. Use `enum` to restrict to a controlled vocabulary.

```json
"primary_diagnosis": {
  "type": "string"
}
```

**Optional constraints:**

| Constraint  | Type             | Description                                          |
| ----------- | ---------------- | ---------------------------------------------------- |
| `enum`      | array of strings | Payload must match one of the listed values exactly. |
| `minLength` | integer          | Minimum character length.                            |
| `maxLength` | integer          | Maximum character length.                            |
| `pattern`   | string (regex)   | Value must match the regular expression.             |

**Example with enum:**

```json
"vital_status": {
  "type": "string",
  "enum": ["alive", "deceased", "unknown"]
}
```

What this means: Song rejects any payload where `vital_status` is not exactly `alive`, `deceased`, or `unknown`. The check is case-sensitive.

### integer

Accepts whole numbers. Use `minimum` and `maximum` to define an inclusive valid range.

```json
"age_at_diagnosis": {
  "type": "integer",
  "minimum": 0,
  "maximum": 150
}
```

**Optional constraints:**

| Constraint         | Type    | Description                                             |
| ------------------ | ------- | ------------------------------------------------------- |
| `minimum`          | integer | Inclusive lower bound.                                  |
| `maximum`          | integer | Inclusive upper bound.                                  |
| `exclusiveMinimum` | integer | Exclusive lower bound (value must be strictly greater). |
| `exclusiveMaximum` | integer | Exclusive upper bound (value must be strictly less).    |
| `multipleOf`       | integer | Value must be a multiple of this number.                |

What this means: a payload with `"age_at_diagnosis": -1` or `"age_at_diagnosis": 200` will fail Song validation before being stored.

### number

Accepts integers and decimals. Supports the same `minimum`/`maximum` constraints as `integer`.

```json
"tumour_purity": {
  "type": "number",
  "minimum": 0,
  "maximum": 1
}
```

### boolean

Accepts `true` or `false`. No additional constraints apply.

```json
"is_ffpe": {
  "type": "boolean"
}
```

### array

Accepts a JSON array. Use `items` to define the schema each element must match, and `minItems`/`maxItems` to constrain length.

```json
"biomarkers": {
  "type": "array",
  "items": { "type": "string" },
  "minItems": 1
}
```

**Optional constraints:**

| Constraint    | Type    | Description                                      |
| ------------- | ------- | ------------------------------------------------ |
| `items`       | schema  | Schema each array element must validate against. |
| `minItems`    | integer | Minimum number of elements.                      |
| `maxItems`    | integer | Maximum number of elements.                      |
| `uniqueItems` | boolean | If `true`, all elements must be distinct.        |

### object

Accepts a nested JSON object. Use `properties` to define its fields and `required` to enforce which are mandatory.

```json
"sequencing_info": {
  "type": "object",
  "required": ["platform"],
  "properties": {
    "platform": { "type": "string" },
    "read_length": { "type": "integer" }
  }
}
```

## Required Fields

Fields listed in the `required` array of an object must be present in every payload. A missing required field causes Song to return a `400` validation error.

```json
{
  "type": "object",
  "required": ["sex", "age_at_diagnosis", "vital_status"],
  "properties": {
    "sex": { "type": "string", "enum": ["male", "female", "other", "unknown"] },
    "age_at_diagnosis": { "type": "integer", "minimum": 0, "maximum": 150 },
    "vital_status": {
      "type": "string",
      "enum": ["alive", "deceased", "unknown"]
    }
  }
}
```

Fields omitted from `required` are optional: payloads that do not include them will still pass validation.

## Nullable Fields

To allow a field to be explicitly set to `null`, use an array type:

```json
"matched_normal_id": {
  "type": ["string", "null"]
}
```

What this means: the field accepts either a string value or JSON `null`. Without this, `null` will fail string type validation.

## Conditional Validation

JSON Schema `if`/`then`/`else` blocks allow fields to become required or constrained based on the value of another field.

```json
{
  "type": "object",
  "properties": {
    "vital_status": {
      "type": "string",
      "enum": ["alive", "deceased", "unknown"]
    },
    "cause_of_death": { "type": "string" }
  },
  "if": {
    "properties": { "vital_status": { "const": "deceased" } },
    "required": ["vital_status"]
  },
  "then": {
    "required": ["cause_of_death"]
  }
}
```

What this means: `cause_of_death` is only required when `vital_status` is `"deceased"`. If `vital_status` is `"alive"` or `"unknown"`, the field is optional and Song will not enforce it.

## Full Example: `genomicVariants`

The complete dynamic schema used in this deployment (`configs/songConfigs/genomicVariants.json`):

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
          "diagnosis_date": { "type": "string" },
          "disease_stage": { "type": "string" },
          "primary_diagnosis": { "type": "string" },
          "treatment_type": { "type": "string" },
          "treatment_response": { "type": "string" }
        }
      }
    }
  }
}
```
