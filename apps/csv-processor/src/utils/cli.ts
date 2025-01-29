import { Command } from 'commander';
import { Config } from '../types';

/*
 * Sets up and processes command line arguments for the CSV processing utility
 * Returns configuration object and input file path
 */

export function setupCLI(): { config: Config; filePath: string } {
  // Initialize a new Command instance for handling CLI arguments
  const program = new Command();

  // Configure the CLI application with name, description and available options
  program
    .name('csv-processor')
    .description('Process CSV files into Elasticsearch')
    // Required file path option - must be provided by user
    .requiredOption('-f, --file <path>', 'CSV file path')
    .requiredOption('-i, --index <name>', 'Elasticsearch index name, tabular-index')
    // Optional configurations with default values
    .option('--url <url>', 'Elasticsearch URL', 'http://localhost:9200')
    .option('-u, --user <username>', 'Elasticsearch username', 'elastic')
    .option('-p, --password <password>', 'Elasticsearch password', 'myelasticpassword')
    // Processing configuration options
    .option('-b, --batch-size <size>', 'Batch size for processing', '1000')
    .option('-d, --delimiter <char>', 'CSV delimiter', ',')
    .parse();

  // Extract all options from the command instance, longer form names (--url) become property names (url)
  const options = program.opts();

  // Return structured configuration object and file path
  return {
    config: {
      // Elasticsearch connection configuration
      elasticsearch: {
        url: options.url,
        index: options.index,
        user: options.user,
        password: options.password,
      },
      // Processing configuration
      batchSize: parseInt(options.batchSize), // Convert string to number
      delimiter: options.delimiter,
    },
    filePath: options.file, // Path to the input CSV file
  };
}
