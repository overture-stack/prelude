# Data Preparation

In this section, we'll look at how to organize your data and what CSV formatting requirements need to be met.

### The Data Folder

Your CSV files can live anywhere on your machine, our data upload utility, Conductor, will accept a file path at upload time, so the portal doesn't require a fixed location. However, for this workshop we use the `data/` directory at the project root as a convenient working area. Place a representative subset of your data here so we have something to configure and test against:

```plaintext
project-root/
└── data/
    ├── datatable1.csv    # → a representative subset of your data
    ├── datatable2.csv    # → optional additional table
    └── ...
```

### CSV Requirements

#### File Format & Header Rules

Your CSV column headers become field names in PostgreSQL, Elasticsearch, and GraphQL, so they must be valid across all three.

| Rule                      | Details                                                                                                                                                                                                                                                                                                      |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Format**                | CSV (comma-separated); other delimiters supported via `--delimiter` but for simplicity we recommend using comma-separated files.                                                                                                                                                                             |
| **Header row**            | Required as the first line                                                                                                                                                                                                                                                                                   |
| **Prohibited characters** | `: > < . [space] , / \ ? # [ ] { } " * \| + @ & ( ) ! ^`                                                                                                                                                                                                                                                     |
| **Max length**            | A maximum 63 characters per header name, PostgreSQL silently truncates longer identifiers, which can cause mismatches between your schema and index                                                                                                                                                          |
| **Reserved words**        | These are internal field names used by Elasticsearch and GraphQL. Using them will conflict with system internals and cause indexing or query errors: `_type` `_id` `_source` `_all` `_parent` `_field_names` `_routing` `_index` `_size` `_timestamp` `_ttl` `_meta` `_doc` `__typename` `__schema` `__type` |
| **Best practices**        | Use `snake_case` or `camelCase`, lowercase, descriptive but concise, no special characters or spaces                                                                                                                                                                                                         |

Here are some examples to help illustrate:

| Good Headers         | Bad Headers          | Why                                      |
| -------------------- | -------------------- | ---------------------------------------- |
| `donor_id`           | `Donor ID!`          | Spaces and `!` are prohibited characters |
| `age_at_diagnosis`   | `Age at Diagnosis`   | Spaces are prohibited; use lowercase     |
| `primary_site`       | `Primary.Site`       | `.` is a prohibited character            |
| `treatment_response` | `treatment/response` | `/` is a prohibited character            |

#### Data Types

Composer will automatically infer field types when generating Elasticsearch mappings:

| CSV Content             | Elasticsearch Type | Example                                     |
| ----------------------- | ------------------ | ------------------------------------------- |
| Text/categorical values | `keyword`          | `"Lung"`, `"Female"`, `"Complete Response"` |
| Whole numbers           | `integer`          | `45`, `120`, `365`                          |
| Decimal numbers         | `float`            | `3.14`, `0.95`                              |
| Dates (ISO format)      | `date`             | `2024-01-15`                                |

The goal is to get the structure right, you can review and adjust individual type assignments after Composer generates the mapping, which we'll cover in the next section.

:::tip
LLMs can be a powerful aid for reviewing, refining and troubleshooting configurations. Just ensure any data shared with an external model complies with your institution's data governance and privacy requirements.
:::

#### Version Control Best Practices

Keep data files out of version control, this keeps the repository lightweight and prevents accidentally publishing raw or sensitive data. The `prelude` repository's `.gitignore` already excludes common data file patterns, but if you are bringing your own data, verify your files are covered:

```bash
# In your .gitignore
*.csv
*.tsv
*.xlsx
data/
```

<details>
<summary><strong>What these patterns do</strong></summary>

| Pattern  | What it ignores                                       |
| -------- | ----------------------------------------------------- |
| `*.csv`  | All CSV files anywhere in the repository              |
| `*.tsv`  | All tab-separated files                               |
| `*.xlsx` | All Excel files                                       |
| `data/`  | The entire `data/` directory and everything inside it |

Git ignores are additive, adding these patterns will not affect files already being tracked. If a data file was previously committed, you'll need to untrack it first:

```bash
git rm --cached path/to/your-file.csv
```

</details>

To check whether a file is being tracked:

```bash
git check-ignore -v path/to/your-file.csv
```

If you're working with data that has any access restrictions, use anonymized or synthetic samples during development and only load real data in controlled environments.

#### Recommended Data Size

There are no strict size limits beyond Docker and Elasticsearch resource constraints. In fact we've scaled this resource to hundreds millions of records. However, for development and testing, a representative sample of approximately **500 records** works well. You can start small and load larger datasets once your configuration is working.

### Flat vs. Hierarchical Data

The portal in this workshop handles **flat tabular data**, each row is an independent record. If you have hierarchical data (e.g., a patient with multiple specimens, each with multiple samples), flatten it: create one row per leaf-level entity (e.g., one row per sample) with parent fields repeated.

:::tip
If your data is inherently hierarchical and flattening isn't appropriate, Overture's data management services, Lectern (data dictionaries) paired with Lyric (tabular submission) or Song (file submission), handle hierarchical schemas natively. If this intrests you can check out available documentation or reach out to us at contact@overture.bio
:::

### Checkpoint

Before proceeding, confirm:

- [ ] A representative subset of your data is in the `data/` directory
- [ ] Running `head -5 data/datatable1.csv` shows your headers and data rows
- [ ] Headers use `snake_case` with no spaces or special characters
- [ ] You understand that each CSV file becomes one data table in the portal

**Next:** With data prepared, we'll use Composer to generate the Elasticsearch and Arranger configuration files.
