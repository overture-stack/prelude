"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupCLI = setupCLI;
const commander_1 = require("commander");
/*
 * Sets up and processes command line arguments for the CSV processing utility
 * Returns configuration object and input file path
 */
function setupCLI() {
    // Initialize a new Command instance for handling CLI arguments
    const program = new commander_1.Command();
    // Configure the CLI application with name, description and available options
    program
        .name('csv-processor')
        .description('Process CSV files into Elasticsearch')
        .option('-m, --mode <enum>', 'Either upload or mapping', 'upload')
        .requiredOption('-f, --file <path>', 'CSV file path')
        .requiredOption('-i, --index <name>', 'Elasticsearch index name', 'tabular-index')
        .option('-o, --output <file>', 'Output mapping JSON file (required for mapping mode)')
        .option('--url <url>', 'Elasticsearch URL', 'http://localhost:9200')
        .option('-u, --user <username>', 'Elasticsearch username', 'elastic')
        .option('-p, --password <password>', 'Elasticsearch password', 'myelasticpassword')
        .option('-b, --batch-size <size>', 'Batch size for processing', '1000')
        .option('-d, --delimiter <char>', 'CSV delimiter', ',');
    program.parse();
    // Extract all options from the command instance
    const options = program.opts();
    // Validate mode-specific requirements
    if (options.mode === 'mapping' && !options.output) {
        console.error('Error: --output option is required when using mapping mode');
        process.exit(1);
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
    };
}
