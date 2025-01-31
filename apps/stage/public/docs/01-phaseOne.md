# PhaseOne

PhaseOne focuses on how you want your data displayed in the front-end portal.
Here you want to figure out how many data tables you want and how you want them
configured. This is also a good time to do any theming of your portal. The idea
is to get the look and feel of the user experience down before diving into your
back-end data management configurations. The architecture of this phase is as
follows:

![Image Title](/docs/images/phaseOne.png "PhaseOne Architecture Diagram")

A description of each component shown above is provided here with links to the
relevant documentation pages.

| Component                                                                                              | Description                                                                                 |
| ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| CSV-Processor (Docs below)                                                                             | A command-line tool for processing CSV files into Elasticsearch.                            |
| [Elasticsearch](https://www.elastic.co/guide/en/elasticsearch/reference/7.17/elasticsearch-intro.html) | A search and analytics engine used to help query massive datasets flexibly and efficiently. |
| [Arranger](https://docs.overture.bio/docs/core-software/arranger/overview)                             | Our search API and search UI component generation service.                                  |
| [Stage](https://docs.overture.bio/docs/core-software/stage/overview/)                                  | Our React-based user interface designed to allow easy deployment of data portals.           |

## Step 1: Prepare your data

The `data` folder at the root of this project is for storing data files used in
your project. Below are guidelines for data management:

### File Format

- The csv-processor supports configurable delimiters, but CSV (Comma-Separated
  Values) is the recommended format for tabular data
- Include headers in your CSV files for clear column identification; your
  Elasticsearch index mapping should match these field names

### Security

- If storing sensitive data, add your data files to `.gitignore` before
  committing to GitHub
- If pushing data files to GitHub, review them for any personally identifiable
  information (PII) before committing

### Size

- Use representative sample datasets of approximately 500 records for
  development and testing
- No strict minimum or maximum size limits exist beyond Docker and Elasticsearch
  resource constraints

## Step 2: Update portal configurations

The `config` directory at the root of this project contains configuration files
for the Elasticsearch indices and Arranger components. The configurations are
organized to support both a file and a tabular data exploration page, but can be
replicated to support more tables. Note: Our documentation is pending updates to
include information on creating new data tables and updating Stage's navigation
and other standard components. If you would like to contribute or have a
suggestion, please reach out through our
<a href="https://docs.overture.bio/community/support" target="_blank" rel="noopener">relevant
community support channels</a>.

### Directory Structure

```
configs/
├── arrangerConfigs/
│   ├── fileDataConfigs/      # Configs for file data explorer
│   └── tabularDataConfigs/   # Configs for tabular data explorer
└── elasticsearchConfigs/
    ├── file_data_index_template.json # Mapping for file data index
    └── tabular_data_index_template.json # Mapping for tabular data index
```

### Arranger Configs

The `arrangerConfigs/` folder contains configuration files for the tabular and
file data exploration table and facets:

- `base.json` - Core settings including document type and index name
- `extended.json` - Field mappings and display properties
- `table.json` - Data table layout and column settings
- `facets.json` - Search facet configurations

Within the `docker-compose.phaseOne.yml`, these configurations are passed to
each Arranger instance as volumes. Arranger uses these to generate a GraphQL API
linked to its front-end UI components. For more information, see our
[data portal customization guide](https://docs.overture.bio/guides/administration-guides/customizing-the-data-portal).

### Elasticsearch Configs

The `elasticsearchConfigs/` folder contains index templates that define how
documents and fields are stored and indexed in Elasticsearch. You can see these
files referenced in the docker-compose as volumes passed to conductor and used
for our Elasticsearch service scripts used for initializing our Elasticsearch
indices. For general information on index mappings in Overture, refer to our
[index mappings documentation](https://docs.overture.bio/guides/administration-guides/index-mappings).

**Note:** This configuration setup uses Elasticsearch 7.x. Ensure all
configurations follow Elasticsearch 7 syntax and conventions.

## Step 3: Update Stage (optional)

A React-based UI framework designed for data portals that work with Overture's
Arranger service. More detailed documentation can be found at
[our official Stage developer documentation](https://docs.overture.bio/docs/core-software/Stage/overview).

If you have any questions, please don't hesitate to reach out through our
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

## Step 4: Submit your data (CSV-Processor)

The CSV-Processor is a Node.js command-line tool for processing and uploading
CSV files to Elasticsearch, featuring validation, error handling, and mapping
generation capabilities.

### Containerized Upload

If you want to input data without locally installing the CSV-Processor, it can
be run from the conductor container using the `make load-data` command. Make
sure you have your desired data file within the `data` directory found at the
root of the project. Additionally, ensure you update conductor's
`TABULAR_DATA_FILE:` with the path to your desired data file.

If you wish to install and run the CSV-Processor locally, then follow the steps
below:

### Installation

Ensure you have the following installed:

- Node.js ≥ 14
- npm or yarn package manager

1. From the CSV-Processor directory, install dependencies:

```bash
cd apps/csv-processor
npm install
```

2. Build from TypeScript:

```bash
npm run build
```

3. Install the utility globally (optional):

```bash
npm install -g .
```

Note: If you choose not to install globally, then you will need to run all
upload commands directly from the CSV-Processor directory using either node or
the dist folder's `main.js`.

### Usage

Basic command structure:

```bash
csv-processor -f <file-path> -i <index-name> [options]
```

#### Configuration Options

| Option                      | Description                             | Default               |
| --------------------------- | --------------------------------------- | --------------------- |
| `-f, --file <path>`         | CSV file path (required)                | -                     |
| `-i, --index <name>`        | Elasticsearch index name (required)     | -                     |
| `-m, --mode <enum>`         | Processing mode ('upload' or 'mapping') | upload                |
| `-o, --output <file>`       | Output for mapping JSON file            | -                     |
| `--url <url>`               | Elasticsearch URL                       | http://localhost:9200 |
| `-u, --user <username>`     | Elasticsearch username                  | elastic               |
| `-p, --password <password>` | Elasticsearch password                  | myelasticpassword     |
| `-b, --batch-size <size>`   | Processing batch size                   | 1000                  |
| `-d, --delimiter <char>`    | CSV delimiter                           | ,                     |

#### Operating Modes

The tool supports two operating modes:

1. **Upload Mode** (default): Processes and uploads CSV data directly to
   Elasticsearch
2. **Mapping Mode**: Generates an Elasticsearch mapping file based on CSV
   structure

#### Example Commands

Upload data to Elasticsearch:

```bash
csv-processor -f data.csv -i my-index --url http://localhost:9200 -u elastic -p mypassword
```

Generate mapping file:

```bash
csv-processor -m mapping -f data.csv -o mapping.json
```

Custom delimiter and batch size:

```bash
csv-processor -f data.csv -i my-index -d ";" -b 100
```

### Troubleshooting

Common issues and solutions:

1. **Header Mismatches**: Ensure CSV headers match Elasticsearch mapping exactly
2. **Connection Errors**: Verify Elasticsearch URL and credentials
3. **Performance Issues**: Adjust batch size as needed
4. **File Access Errors**: Verify file permissions and path
5. **Mapping Generation**: When using mapping mode, ensure the output path is
   writable
