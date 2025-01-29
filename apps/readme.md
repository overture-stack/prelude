# Apps Directory

All localized applications are included in this folder, this includes:

- Stage: A React-based UI scaffolding for data portals
- CSV-processor: A command-line tool for processing CSV files into Elasticsearch

## CSV-processor

A Node.js command-line tool for processing and uploading CSV files to
Elasticsearch, featuring validation and error handling.

### Prerequisites

- Node.js ≥ 14
- npm or yarn package manager

### Installation

1. Install dependencies:

```bash
npm install
```

2. Build from TypeScript:

```bash
npm run build
```

3. Optional global installation:

```bash
npm install -g .
```

### Usage

Basic command structure:

```bash
csv-processor -f <file-path> [options]
```

#### Configuration Options

| Option                      | Description              | Default               |
| --------------------------- | ------------------------ | --------------------- |
| `-f, --file <path>`         | CSV file path (required) | -                     |
| `--url <url>`               | Elasticsearch URL        | http://localhost:9200 |
| `-i, --index <name>`        | Elasticsearch index name | tabular-index         |
| `-u, --user <username>`     | Elasticsearch username   | elastic               |
| `-p, --password <password>` | Elasticsearch password   | myelasticpassword     |
| `-b, --batch-size <size>`   | Processing batch size    | 1000                  |
| `-d, --delimiter <char>`    | CSV delimiter            | ,                     |

#### Example Commands

Custom Elasticsearch configuration:

```bash
csv-processor -f data.csv --url http://localhost:9200 -i my-index -u elastic -p mypassword
```

Custom delimiter and batch size:

```bash
csv-processor -f data.csv -d ";" -b 100
```

### Troubleshooting

Common issues and solutions:

1. **Header Mismatches**: Ensure CSV headers match Elasticsearch mapping exactly
2. **Connection Errors**: Verify Elasticsearch URL and credentials
3. **Performance Issues**: Adjust batch size as needed
4. **File Access Errors**: Verify file permissions and path

## Stage

A React-based UI framework designed for data portals that work with Overture's
Arranger service. More detailed documentation can be found at and will be update
to
[our offical stage developer documentation](https://docs.overture.bio/docs/core-software/Stage/overview)

If you have any questions please don't hesitate to reach out through our
<a href="https://docs.overture.bio/community/support" target="_blank" rel="noopener">relevant
community support channels</a>.

### Prerequisites

- Node.js ≥ 16
- npm ≥ 8.3.0

### Local Development Setup

1. Run the make command:

```bash
make stage-dev
```

2. Navigate to the Stage directory and set up environment:

```bash
cp .env.stageDev .env
```

3. Install dependencies:

```bash
npm ci
```

4. Start development server:

```bash
npm run dev
```

The development server will be available at: http://localhost:3000
