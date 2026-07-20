# Data Folder

This folder holds the data files used by the platform.

## Layout

| Path         | Contents                                                                                      |
| ------------ | --------------------------------------------------------------------------------------------- |
| `tables/`    | Dataset CSVs loaded into the portal (one `<name>.csv` per table, e.g. `correlation.csv`).     |
| `fixtures/`  | Fixture-generation toolkit (build scripts, schema, generated `fixtures.jsonl`).               |

To add a table, drop `tables/<name>.csv` here and list `<name>` in the
`DATA_TABLES` variable of the `conductor-cli` service in `docker-compose.yml`.

Below are guidelines for optimal data management:

## File Format

- Include headers in your CSV files for clear column identification your
  elasticsearch index mapping should match these field names

## Data Security

- If storing sensitive data, add your data files to `.gitignore` before
  committing to GitHub
- If pushing data files to github review them for any personally identifiable
  information (PII) before committing

## Dataset Size

- Use representative sample datasets of approximately 500 records for
  development and testing
- No strict minimum or maximum size limits exist beyond Docker and Elasticsearch
  resource constraints
