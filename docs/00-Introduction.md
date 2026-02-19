# What We Are Building

This workshop guides you through building a data discovery portal using freely available open-source software — transforming tabular datasets into a searchable, FAIR-compliant platform accessible to both researchers and applications.

As a real-world reference, we'll draw from OICR's Drug Discovery Portal: ~405 million indexed records across four linked tables (gene correlations, mutations, expression profiles, protein interactions), used to progressively narrow ~20,000 gene candidates through cross-table filtering in real time.

This stack is purpose-built for exactly that: large structured data that needs to be searchable, filterable, and API-accessible — without building a custom backend from scratch.

> **ILLUSTRATION NEEDED:** A before/after diagram showing the transition from isolated spreadsheets and databases (left side) to a searchable, API-backed data portal (right side). Left side: icons for CSV files, Excel sheets, local databases with no external access. Right side: a browser-based portal with search facets, a GraphQL API endpoint, and arrows showing external collaborators and applications accessing the data.

By the end of this workshop, you will have a locally running data portal consisting of:

- **Postgres:** a database to store persistent data
- **Elasticsearch (or Opensearch):** a powerful search engine to rapidly parse indexed tabular data
- **Arranger:** an interpretive layer enabling intuitive data filtering via both a GraphQL API and UI components
- **Stage:** a React-based portal interface for browsing and exploring data

We will also use two custom CLI tools included in the project: **Composer** for generating configurations, and **Conductor** for loading data into the platform.

## Objectives

1. Deploy a functional data discovery portal using Elasticsearch, GraphQL, Arranger, and Stage
2. Configure search interfaces and indices tailored to tabular datasets
3. Gain familiarity with the tools needed to adapt this portal to your own data
4. Understand deployment options for making portals accessible on institutional networks and beyond

## Workshop Schedule

| Time      | Section                     | Description                                                               |
| --------- | --------------------------- | ------------------------------------------------------------------------- |
| 2:00–2:35 | Introduction & Overview     | Workshop objectives, run the pre-built demo, and architecture walkthrough |
| 2:35–3:25 | Building Your Portal        | Prepare data, generate configurations with Composer, and wire up Docker   |
| 3:25–3:30 | Break                       | Stretch break                                                             |
| 3:30–4:00 | Launch, Customize & Wrap-Up | Load data with Conductor, customize the portal, and discuss next steps    |

## When to Build Custom Infrastructure

Not every dataset needs a portal. Consider building one when:

- **Your data has outgrown spreadsheets:** Tens of thousands of rows, multiple linked tables, or datasets that crash Excel are a signal that queryable infrastructure will save more time than it costs to build.
- **Multiple consumers need the same data:** collaborators, analysis pipelines, or public users all need to query your dataset
- **Search and filtering matters:** users need to find specific subsets, not just download the whole file
- **You need an API:** downstream tools or notebooks need programmatic access, not just a download link
- **You want to control the experience:** custom facets, display names, and branding make data more usable

When a shared spreadsheet or database dump is sufficient, keep it simple. This workshop gives you the tools for when it's not.

## Key Questions

1. What data do you want to share? Why?
2. How is your data structured?
3. What access controls, if any, are required?
4. What in-house technical expertise do you currently have?
