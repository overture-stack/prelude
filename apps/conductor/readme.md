# Conductor

Conductor is a CLI tool for ingesting CSV data into PostgreSQL and Elasticsearch. It supports four workflows, from a simple CSV-to-Elasticsearch upload through to a full pipeline that loads CSV into PostgreSQL and indexes the results into Elasticsearch.

## Installation

### Prerequisites

- Node.js 18+
- npm

### Install globally from the project directory

```bash
cd apps/conductor
npm install
npm install -g .
```

### Run without global installation

```bash
cd apps/conductor
npm install
npm start -- <command> [options]
```

## Commands

### `upload` — CSV → PostgreSQL → Elasticsearch

Loads one or more CSV files into a PostgreSQL table and streams the inserted rows directly into an Elasticsearch index. Rows are deduplicated on re-upload using a SHA-256 hash of the row data.

```bash
conductor upload -f data.csv -t my_table -i my-index
```

| Option | Description | Default |
|--------|-------------|---------|
| `-f, --file <files...>` | Input CSV files | — |
| `-t, --table <name>` | PostgreSQL table name | — |
| `-i, --index <name>` | Elasticsearch index name | — |
| `-b, --batch-size <n>` | Records per batch | `5000` |
| `--delimiter <char>` | CSV delimiter | `,` |
| `--db-host <host:port>` | PostgreSQL host | `localhost:5435` |
| `--db-name <name>` | Database name | `overtureDb` |
| `--db-user <user>` | Database username | `admin` |
| `--db-pass <password>` | Database password | `admin123` |
| `--es-host <host:port>` | Elasticsearch host | `localhost:9200` |
| `--es-user <username>` | Elasticsearch username | `elastic` |
| `--es-pass <password>` | Elasticsearch password | `myelasticpassword` |

---

### `upload-es` — CSV → Elasticsearch

Uploads CSV files directly to an Elasticsearch index, bypassing PostgreSQL.

```bash
conductor upload-es -f data.csv -i my-index
```

| Option | Description | Default |
|--------|-------------|---------|
| `-f, --file <files...>` | Input CSV files | — |
| `-i, --index <name>` | Elasticsearch index name | — |
| `-b, --batch-size <n>` | Records per batch | `5000` |
| `--delimiter <char>` | CSV delimiter | `,` |
| `--es-host <host:port>` | Elasticsearch host | `localhost:9200` |
| `--es-user <username>` | Elasticsearch username | `elastic` |
| `--es-pass <password>` | Elasticsearch password | `myelasticpassword` |

---

### `upload-db` — CSV → PostgreSQL

Loads CSV files into a PostgreSQL table only. No Elasticsearch interaction.

```bash
conductor upload-db -f data.csv -t my_table
```

| Option | Description | Default |
|--------|-------------|---------|
| `-f, --file <files...>` | Input CSV files | — |
| `-t, --table <name>` | PostgreSQL table name | — |
| `-b, --batch-size <n>` | Records per batch | `5000` |
| `--delimiter <char>` | CSV delimiter | `,` |
| `--db-host <host:port>` | PostgreSQL host | `localhost:5435` |
| `--db-name <name>` | Database name | `overtureDb` |
| `--db-user <user>` | Database username | `admin` |
| `--db-pass <password>` | Database password | `admin123` |

---

### `index-db` — PostgreSQL → Elasticsearch

Reads an existing PostgreSQL table and indexes all rows into Elasticsearch. Uses a server-side cursor for memory-efficient streaming of large tables.

```bash
conductor index-db -t my_table -i my-index
```

| Option | Description | Default |
|--------|-------------|---------|
| `-t, --table <name>` | PostgreSQL table name | — |
| `-i, --index <name>` | Elasticsearch index name | — |
| `-b, --batch-size <n>` | Records per ES batch | `5000` |
| `--db-host <host:port>` | PostgreSQL host | `localhost:5435` |
| `--db-name <name>` | Database name | `overtureDb` |
| `--db-user <user>` | Database username | `admin` |
| `--db-pass <password>` | Database password | `admin123` |
| `--es-host <host:port>` | Elasticsearch host | `localhost:9200` |
| `--es-user <username>` | Elasticsearch username | `elastic` |
| `--es-pass <password>` | Elasticsearch password | `myelasticpassword` |

---

## Global options

| Option | Description |
|--------|-------------|
| `--debug` | Enable debug logging (stack traces, raw responses) |
| `-h, --help` | Show all commands with examples |

## Troubleshooting

- Run with `--debug` for detailed logging and stack traces
- Ensure the target services are running and reachable at the configured hosts
- Check that the Elasticsearch index exists before running `upload-es` or `index-db`
- CSV headers must match the column names in the target PostgreSQL table or Elasticsearch index mapping
- See `docs/deduplication.md` for details on how duplicate records are handled
