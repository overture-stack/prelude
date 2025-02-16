import { Command } from 'commander';
import { Config } from '../types';
import * as path from 'path';

type CLIMode = 'dictionary' | 'upload' | 'mapping' | 'arranger' | 'all';

export function setupCLI(): {
  config: Config;
  filePaths: string[];
  outputPath: string;
  mode: CLIMode;
  arrangerConfigDir?: string;
  dictionaryConfig?: {
    name: string;
    description: string;
    version: string;
  };
} {
  const program = new Command();

  // Configure the CLI application with name and description
  program
    .name('composer')
    .description('Process CSV files into Dictionary or Elasticsearch')
    .option(
      '-m, --mode <mode>',
      'Operation mode: dictionary, upload, mapping, arranger, or all',
      'upload'
    )
    .requiredOption('-f, --files <paths...>', 'CSV file paths (space separated)')
    .option('-i, --index <name>', 'Elasticsearch index name', 'tabular-index')
    .option('-o, --output <file>', 'Output file path for dictionary or mapping')
    .option(
      '--arranger-config-dir <path>',
      'Directory to output Arranger configuration files (required for arranger mode)'
    )
    // Dictionary specific options
    .option('-n, --name <name>', 'Dictionary name (required for dictionary mode)')
    .option(
      '-d, --description <text>',
      'Dictionary description',
      'Generated dictionary from CSV files'
    )
    .option('-v, --version <version>', 'Dictionary version', '1.0.0')
    // Elasticsearch specific options
    .option('--url <url>', 'Elasticsearch URL', 'http://localhost:9200')
    .option('-u, --user <username>', 'Elasticsearch username', 'elastic')
    .option('-p, --password <password>', 'Elasticsearch password', 'myelasticpassword')
    .option('-b, --batch-size <size>', 'Batch size for processing', '1000')
    .option('--delimiter <char>', 'CSV delimiter', ',');

  program.parse();
  const options = program.opts();

  // Validate mode-specific requirements
  switch (options.mode as CLIMode) {
    case 'dictionary':
      if (!options.name) {
        console.error('Error: --name is required when using dictionary mode');
        process.exit(1);
      }
      if (!options.output) {
        options.output = `./${options.name}-dictionary.json`;
      }
      break;

    case 'upload':
      // No special validation needed for upload mode
      break;

    case 'mapping':
      if (!options.output) {
        options.output = `./${options.index}-mapping.json`;
      }
      break;

    case 'arranger':
    case 'all':
      if (!options.arrangerConfigDir) {
        console.error('Error: --arranger-config-dir is required when using arranger or all mode');
        process.exit(1);
      }
      if (!options.output) {
        options.output = path.join(path.dirname(options.arrangerConfigDir), 'mapping.json');
      }
      break;

    default:
      console.error(`Error: Invalid mode '${options.mode}'`);
      process.exit(1);
  }

  // Return structured configuration
  return {
    config: {
      elasticsearch: {
        url: options.url,
        index: options.index,
        user: options.user,
        password: options.password
      },
      batchSize: parseInt(options.batchSize),
      delimiter: options.delimiter
    },
    filePaths: options.files,
    outputPath: options.output,
    mode: options.mode as CLIMode,
    arrangerConfigDir: options.arrangerConfigDir,
    // Only include dictionary config if in dictionary mode
    dictionaryConfig:
      options.mode === 'dictionary'
        ? {
            name: options.name,
            description: options.description,
            version: options.version
          }
        : undefined
  };
}
