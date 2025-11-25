# Conductor

Conductor streamlines managment and interaction with Overture microservices in two ways:

1. **Deployment Automation**: Conductor manages and orchestrates Overture deployments through scripts found in the `scripts` directory. These are initiated from the docker-compose. This provides a consistent and reliable environment setup.

2. **Command-Line Interface**: Conductor offers a unified CLI for interacting with various Overture service APIs. The command line client includes additional validations and helpful error logging to improve the user experience.

## Installation

### Prerequisites

- Node.js 14+
- npm or yarn

### Installing from the project directory

Since Conductor is located in the `apps/conductor` directory of the Prelude repo, you can install it locally from that directory:

```bash
cd apps/conductor
npm install
npm install -g .
```

This installs Conductor globally, making conductor commands available in your terminal.

### Alternative: Using without global installation

If you prefer not to install globally, you can run Conductor directly from the project directory:

```bash
cd apps/conductor
npm install
npm start -- <command> [options]
```

For example:

```bash
npm start -- upload -f ../../data/sample.csv -i my-index
```

## Usage

All available and documented commands can be found by running conductor -h.

### Lyric Data Management Workflow

1. Upload schema to Lectern:

   ```bash
   conductor lecternUpload -s dictionary.json
   ```

2. Register dictionary with Lyric:

   ```bash
   conductor lyricRegister -c category1 --dict-name dictionary1 -v 1.0 -e entity1
   ```

3. Load data into Lyric:
   ```bash
   conductor lyricData -d ./clinical-data -c 1 -g "Research Organization"
   ```

### Complete SONG/SCORE Workflow

1. Create a study in SONG:

   ```bash
   conductor songCreateStudy -i my-study -n "My Research Study" -g MyOrg
   ```

2. Upload a schema to SONG:

   ```bash
   conductor songUploadSchema -s analysis-schema.json
   ```

3. Submit an analysis to SONG:

   ```bash
   conductor songSubmitAnalysis -a analysis.json -i my-study
   ```

4. Upload files to SCORE:

   ```bash
   conductor scoreManifestUpload -a <analysis-id> -d ./data
   ```

5. Publish the analysis:
   ```bash
   conductor songPublishAnalysis -a <analysis-id> -i my-study
   ```

### Repository Indexing Commands

```bash
conductor maestroIndex --repository-code lyric.overture
```

Repository codes are set within the docker compose and are defined within the Maestro services environment variables.

## Troubleshooting

If you encounter issues:

1. Run with `--debug` flag for detailed logging
2. Ensure services are running and accessible
3. Check connection URLs and authentication credentials
4. Validate input files match expected formats
