import { Command } from 'commander';
import { Config } from '../types';
import * as path from 'path';

/*
 * Sets up and processes command line arguments for the CSV processing utility
 * Returns configuration object and input file path
 */
export function setupCLI(): {
  config: Config;
  filePath: string;
  outputPath: string;
  mode: string;
  arrangerConfigDir?: string;
} {
  // Initialize a new Command instance for handling CLI arguments
  const program = new Command();

  // Configure the CLI application with name, description and available options
  program
    .name('csv-processor')
    .description('Process CSV files into Elasticsearch')
    .option('-m, --mode <enum>', 'Either upload, mapping, or arranger', 'upload')
    .requiredOption('-f, --file <path>', 'CSV file path')
    .requiredOption('-i, --index <name>', 'Elasticsearch index name', 'tabular-index')
    .option('-o, --output <file>', 'Output mapping JSON file (required for mapping mode)')
    .option(
      '--arranger-config-dir <path>',
      'Directory to output Arranger configuration files (required for arranger mode)'
    )
    .option('--url <url>', 'Elasticsearch URL', 'http://localhost:9200')
    .option('-u, --user <username>', 'Elasticsearch username', 'elastic')
    .option('-p, --password <password>', 'Elasticsearch password', 'myelasticpassword')
    .option('-b, --batch-size <size>', 'Batch size for processing', '1000')
    .option('-d, --delimiter <char>', 'CSV delimiter', ',');

  program.parse();

  // Extract all options from the command instance
  const options = program.opts();

  // Validate and setup config directory requirements
  if ((options.mode === 'arranger' || options.mode === 'all') && !options.arrangerConfigDir) {
    console.error('Error: --arranger-config-dir is required when using arranger or all mode');
    process.exit(1);
  }

  // Set default mapping output path if not provided
  if ((options.mode === 'mapping' || options.mode === 'all') && !options.output) {
    if (options.arrangerConfigDir) {
      // If arranger config dir is provided, put mapping.json next to it
      options.output = path.join(path.dirname(options.arrangerConfigDir), 'mapping.json');
    } else {
      // Otherwise, use current directory with index name
      options.output = `./${options.index}-mapping.json`;
    }
  }

  // Return structured configuration object and file path
  return {
    config: {
      elasticsearch: {
        url: options.url,
        index: options.index,
        user: options.user,
        password: options.password,
      },
      batchSize: parseInt(options.batchSize),
      delimiter: options.delimiter,
    },
    filePath: options.file,
    outputPath: options.output,
    mode: options.mode,
    arrangerConfigDir: options.arrangerConfigDir,
  };
}
