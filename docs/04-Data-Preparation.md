# Data Preparation

In this section, we'll look at how to organize your data and what CSV formatting requirements need to be met.

## The Data Folder

Your CSV files can live anywhere on your machine Conductor will accept a file path at upload time, so the portal doesn't require a fixed location. However, for this workshop we use the `data/` directory at the project root as a convenient working area. Place a representative subset of your data here so we have something to configure and test against:

```
project-root/
└── data/
    ├── datatable1.csv    # → a representative subset of your data
    ├── datatable2.csv    # → optional additional table
    └── ...
```

```bash
cp /path/to/your/data.csv data/datatable1.csv
```

The structure of each CSV directly determines the columns and fields available for search and display. You can preview your data to confirm it's in place:

```bash
head -5 data/datatable1.csv
```

## CSV Requirements

### File Format

- **Comma-Separated Values (CSV)** is the recommended format (other delimiters are supported via Conductor's `--delimiter` flag)
- Files must include a **header row** as the first line
- Data should be clean and consistently formatted

### Header Naming Rules

Your CSV column headers will become Postgres, Elasticsearch and GraphQL query field names. They must follow these conventions:

**Prohibited Characters:** do not use any of these in column headers:

```
: > < . [space] , / \ ? # [ ] { } " * | + @ & ( ) ! ^
```

**Length Restriction:** Maximum 255 characters per header.

**Reserved Words:** do not use these as column headers:

```
_type  _id  _source  _all  _parent  _field_names
_routing  _index  _size  _timestamp  _ttl  _meta  _doc
__typename  __schema  __type
```

**Best Practices:**

- Use `snake_case` (e.g., `age_at_diagnosis`) or `camelCase` (e.g., `ageAtDiagnosis`)
- Keep headers descriptive but concise
- Use lowercase letters
- Avoid special characters and spaces

| Good Headers         | Bad Headers          |
| -------------------- | -------------------- |
| `donor_id`           | `Donor ID!`          |
| `age_at_diagnosis`   | `Age at Diagnosis`   |
| `primary_site`       | `Primary.Site`       |
| `treatment_response` | `treatment/response` |

### Data Types

Composer will automatically infer field types when generating Elasticsearch mappings:

| CSV Content             | Elasticsearch Type | Example                                     |
| ----------------------- | ------------------ | ------------------------------------------- |
| Text/categorical values | `keyword`          | `"Lung"`, `"Female"`, `"Complete Response"` |
| Whole numbers           | `integer`          | `45`, `120`, `365`                          |
| Decimal numbers         | `float`            | `3.14`, `0.95`                              |
| Dates (ISO format)      | `date`             | `2024-01-15`                                |

You can review and adjust these type assignments after Composer generates the mapping; we'll cover that in the next section.

### Version Control Best Practices

Data files are excluded from version control by default via `.gitignore`. This keeps the repository lightweight and avoids accidentally publishing raw data. If you're working with data that has any access restrictions, use anonymized or synthetic samples during development.

### Recommended Data Size

There are no strict size limits beyond Docker and Elasticsearch resource constraints. For development and testing, a representative sample of approximately **500 records** works well. You can start small and load larger datasets once your configuration is working.

## Flat vs. Hierarchical Data

The portal in this workshop handles **flat tabular data**, each row is an independent record. If you have hierarchical data (e.g., a patient with multiple specimens, each with multiple samples), you have two options:

1. **Flatten it:** create one row per leaf-level entity (e.g., one row per sample) with parent fields repeated. This is what we do in this workshop.

2. **Use Overture's data management services:** Lectern (data dictionaries) paired with Lyric (tabular submission) or Song (file submission) handle hierarchical schemas natively. This is covered in the Overture platform documentation and is beyond the scope of this session.

## Checkpoint

Before proceeding, confirm:

- [ ] A representative subset of your data is in the `data/` directory
- [ ] Running `head -5 data/datatable1.csv` shows your headers and data rows
- [ ] Headers use `snake_case` with no spaces or special characters
- [ ] You understand that each CSV file becomes one data table in the portal

> **Next:** With data prepared, we'll use Composer to generate the Elasticsearch and Arranger configuration files.
