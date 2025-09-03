# Phase One Point Five

## Overview

**This guide is for** those in phase one point of Prelude's deployment process. The primary goal is to add a Postgres Db to on top of our phase 1 architecture

**By the end of this guide you will be able to:**

1. Generate PostgreSQL Tables from CSV
2. Upload data to our PostgresDb
3. Index our data into Elasticsearch

## Background Information

Phase One focused on configuring your data for the front-end portal. Phase 1.5 is targeted towards groups who want all the functionality of phase 1 but with a postgres Db for more persistent storage of there tabular data. For many groups who only which to manage tabular data internally this architecture will satisfy there needs.

### Architecture Overview

The phase architecture is diagramed below and detailed in the following table:

![Phase 1.5 Architecture Diagram](/docs/images/phaseOnePointFive.png "Phase 1.5 Architecture Diagram")

| Component                                                                                                  | Description                                                                                                  |
| ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| **Conductor**                                                                                              | A command-line tool for processing CSV files into Elasticsearch. It handles data transformation and loading. |
| **Composer**                                                                                               | A command-line tool for generating base Oveture configuration files.                                         |
| **[PostgreSQL](https://www.postgresql.org/)**                                                              | A powerful, open source object-relational database system                                                    |
| **[Elasticsearch](https://www.elastic.co/guide/en/elasticsearch/reference/7.17/elasticsearch-intro.html)** | A powerful search and analytics engine that enables flexible and efficient querying of massive datasets.     |
| **[Arranger](https://docs.overture.bio/docs/core-software/arranger/overview)**                             | A search API and UI component generation service that creates configurable data exploration interfaces.      |
| **[Stage](https://docs.overture.bio/docs/core-software/stage/overview/)**                                  | A React-based user interface framework designed for easy deployment of customizable data portals.            |

## Step 1: Configure Postgres for your data (Using Composer)

The first step is configuring out postgres Db with the table information needed to create tables relevant to your tabular datasets. We will use Composer to generate the required .sql files from our sample CSVs. All generated .sql located the configs/postgresConfigs directory will be applied to our postgres image on startup. Our postgres ENVs are defined in the docker compose while the script that runs on startup and applies these table configuration can be found at /prelude/apps/conductor/scripts/services/postgres/setup_postgres.sh.

### Implementation

Installation of Composer was covered in oure phase One guide. We will assume this is completed however if needed refer to the phase one guide for more information. We also are assuming you have already prepared your CSV files as outline in the previous phase One guide.

Run the following composer command to generate your .sql file

composer -p PostgresTable -f datatable1.csv

Run `make restart`
enter `phase1`

### Validation

You should see similar logs highlighting the execution of the SQL table during the postgreSQL setup:

```
conductor  | [1/6] Setting up PostgreSQL Schemas
conductor  | Conductor: Checking if PostgreSQL is available
conductor  | PostgreSQL: Not yet available, checking again in 10 seconds
conductor  | Success: PostgreSQL is available at postgres-phase1:5432/phase1_data
conductor  | PostgreSQL: Found 1 SQL files in conductor/configs/postgresConfigs
conductor  | Info: Created tracking table for SQL execution history
conductor  | Executing SQL: create_table
conductor  | Info: Executing SQL file: create_table.sql
conductor  | Success: Executed SQL file create_table
conductor  | Success: PostgreSQL setup completed successfully
```

Additionally you can use a Postgres GUI to simplify validation and troubleshooting here we are using postico to confirm the command was executed and the table(s) is appropriatly within our Db.

![Postico verification](/docs/images/postico.png "Postico Verification")

## Step 2: Upload your data to Postgres (Using Conductor)

### Implementation

### Validation

## Step 3: Index the data into Elasticsearch

### Implementation

### Validation

## Support & Contributions

For support, feature requests, and bug reports, please see our [Support Guide](/documentation/support).

For detailed information on how to contribute to this project, please see our [Contributing Guide](/documentation/contribution).

> **Next Steps:** In phase 2 we will extend the platform by adding our backend tabular data submission system.
