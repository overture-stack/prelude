# Apps Directory

All localized applications are included in this folder, this includes:

- Stage: A React-based UI scaffolding for data portals
- CSV-processor: A command-line tool for processing CSV files into Elasticsearch

## CSV-processor

A Node.js command-line tool for processing and uploading CSV files to
Elasticsearch, featuring validation, error handling, and mapping generation
capabilities.

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

### Updating Stage Banners

# Banners

Stage supports displaying informational banners at the top of each page that can
be configured through environment variables.

![Banners example](./images/banners.png 'Banners example')

## Usage

To configure banners, provide an array of JSON objects representing the contents
of each banner in the `REACT_APP_BANNERS` environment variable for Stage.
Multiple banners can be present at once.

### Banner JSON

Each object should be structured as follows:

```json
{
  "title": string,
  "message": string,
  "type": INFO | WARNING | CRITICAL,
  "dismissible": boolean,
}
```

The object properties are as follows:

- `title` <sup>_optional_</sup>
  - Banner title, supports Markdown
  - Example: `"HCMI Portal Publication [Now Available](https://example.com/)"`
- `message` <sup>_optional_</sup>
  - Banner message, supports Markdown
  - Example:
    `"We are proud to announce a new publication about the impact of HCMI. Read more here: [https://example.com/](https://example.com/)"`
- `type` <sup>_optional_</sup>
  - Banner type
  - Values: `INFO` | `WARNING` | `CRITICAL`
  - Default: `INFO`
- `dismissible` <sup>_optional_</sup>
  - Tells the banner whether users should able to "close" the banner (e.g.
    display an `x` on the top right corner).
  - Values: `true` | `false`
  - Default: `true`

### Example

The following is an example of what the `REACT_APP_BANNERS` env var would look
like to display the same banners in the example image above. Note that the JSON
has been placed on a single line.

```.env
REACT_APP_BANNERS=[{"type":"INFO","dismissible":false,"title":"HCMI Portal Maintenance Notice","message":"Please note that the portal will be down for maintenance from December 21st 2024 at 3:00am to December 23rd 2024 at 10:00am. We apologize for the inconvenience.  \n   \n Please click [here](https://google.ca) for more information: [https://example.com](https://example.com)"},{"type":"WARNING","dismissible":true,"message":"This is a Warning level banner. This example does not have a title, but it is dismissible, as evidenced by the 'x' button in the top right corner. Here is an example of a [markdown link](https://google.ca/)."},{"type":"CRITICAL","dismissible":true,"title":"Dismissible Critical Banner Example with Title","message":"This is an example of a Critical level banner, with a title. It is also dismissible, unlike the Info level banner at the top. To set the banner as dismissible, provide 'dismissible: true' in the JSON object."}]
```
