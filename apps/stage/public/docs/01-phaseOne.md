# Phase One

## Overview

**This guide is for** those in phase one of Prelude's deployment process. The primary goal is to set up and configure Stage, Arranger, and Elasticsearch such that you will be able to access and exploring your tabular data through data exploration pages.

**By the end of this guide you will be able to:**

1. Generate and configure Elasticsearch mappings
2. Generate and configure Arranger UI configs
3. Transform and load your CSV data into Elasticsearch and onto the data table
4. Create multiple data exploration pages for independent datasets
5. Theme your Stage UI to match your organization's branding

## Prerequisites and Requirements

**You will need:**

- Tabular Data in the form of CSV (more details in step 1 below)
- A basic understanding of the following software:
  - [Elasticsearch 7.17](https://www.elastic.co/guide/en/elasticsearch/reference/7.17/index.html)
  - [Arranger](https://docs.overture.bio/docs/core-software/arranger/overview/)
  - [Stage](https://docs.overture.bio/docs/core-software/Stage/overview)
- Optionally we use [Elasticvue](https://elasticvue.com/installation) for viewing, maintaining, configuring, and troubleshooting Elasticsearch

### Quick Setup Verification

If you are starting from this point or want to ensure your system is ready, run the following command from the root of the Prelude directory:

```bash
make phase0
```

This command performs a pre-deployment check and provides all the information you need to set up your system for success.

## Background Information

Phase One focuses on configuring how your data will be displayed in the front-end portal. During this phase, you'll determine the number of data tables needed and their configurations. This is also the ideal time to apply custom theming to your portal. The goal is to establish the look and feel of the user experience before proceeding to more complex back-end data management configurations.

### Architecture Overview

The phase architecture is diagramed below and detailed in the following table:

![Phase 1 Architecture Diagram](/docs/images/phase1.png 'Phase 1 Architecture Diagram')

| Component                                                                                                  | Description                                                                                                  |
| ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| **Conductor**                                                                                              | A command-line tool for processing CSV files into Elasticsearch. It handles data transformation and loading. |
| **Composer**                                                                                               | A command-line tool for generating base Oveture configuration files.                                         |
| **[Elasticsearch](https://www.elastic.co/guide/en/elasticsearch/reference/7.17/elasticsearch-intro.html)** | A powerful search and analytics engine that enables flexible and efficient querying of massive datasets.     |
| **[Arranger](https://docs.overture.bio/docs/core-software/arranger/overview)**                             | A search API and UI component generation service that creates configurable data exploration interfaces.      |
| **[Stage](https://docs.overture.bio/docs/core-software/stage/overview/)**                                  | A React-based user interface framework designed for easy deployment of customizable data portals.            |

## Step 1: Preparing your data

### Introduction

The `data` folder at the root of this project is for storing data files used in
your project. Below are guidelines for data management:

- **File Format**: We support multiple delimiters, but Comma-Separated Values (CSV) are the recommended format for tabular data input.
- **Headers**: Include headers in your CSV files to ensure clear column identification. These headers will directly map to your Elasticsearch index field names.
- **Data Privacy**: When working with sensitive data, add your data files to `.gitignore` before committing to GitHub to prevent accidental exposure.
- **Data Size**: There are no strict size limitations beyond the resource constraints of Docker and Elasticsearch. For development and testing, we recommend using a representative sample of approximately 500 records.

Each CSV file in the `data` folder should represent an independent dataset that you want to view within the exploration tables.

### Implementation

1. Collect your tabular datasets in CSV format
2. Place CSV files in the `data` folder
3. Ensure each CSV file:
   - Has clear, descriptive headers
   - Represents a distinct, independent dataset
   - Contains a representative sample of data

You should also ensure that your headers do not conflict with any elasticsearch or graphQL naming conventions, a summary of invalid characters and reserved words is provided in the dropdown below.

<details>
<summary>Header Naming Conventions</summary>

**Prohibited Characters**: Avoid using `:, >, <, ., [space], ,, /, \, ?, #, [, ], {, }, ", *, |, +, @, &, (, ), !, ^` in column headers.

**Length Restriction**: Maximum header length is 255 characters.

**Reserved Words**: Do not use these as column headers:
`_type`, `_id`, `_source`, `_all`, `_parent`, `_field_names`, `_routing`, `_index`, `_size`, `_timestamp`, `_ttl`, `_meta`, `_doc`, `__typename`, `__schema`, `__type`

**Best Practices**:

- Use snake_case or camelCase
- Keep headers descriptive but concise
- Avoid special characters and spaces
- Use lowercase letters

**Example**:

- **Good**: `user_id,first_name,last_name,email_address`
- **Bad**: `User ID!,First Name,Email@Address`

Following these guidelines ensures smooth Elasticsearch indexing and prevents data ingestion issues.

</details>

### Validation

To verify successful data preparation:

- Your data folder should include one CSV file for each desired data table:

  ```
  project-root/
  └── data/
      ├── dataset1.csv
      ├── dataset2.csv
      └── dataset3.csv
  ```

- Open each CSV file and confirm:
  - Headers are present and valid
  - Data is clean and formatted consistently
  - No sensitive information is exposed
- Confirm your `.gitignore` includes data files if necessary

### Next Steps

After completing data preparation, you'll be ready to generate your Arranger and Stage configuration files.

## Step 2: Update portal configurations

Introduction: Provide a brief overview of what this step accomplishes and why it's necessary

Implementation: Stepwise instructions on what to do.

Validation How can we verify the implementation was successful. What is the expected output?

## Step 3: Submit your data

Introduction: Provide a brief overview of what this step accomplishes and why it's necessary

Implementation: Stepwise instructions on what to do.

Validation How can we verify the implementation was successful. What is the expected output?

## Step 4: Updating Stage (optional)

Introduction: Provide a brief overview of what this step accomplishes and why it's necessary

Implementation: Stepwise instructions on what to do.

- Theming
- Creating Data Tables

Validation How can we verify the implementation was successful. What is the expected output?
