#!/usr/bin/env node

import { setupCLI } from './utils/cli';
import { createClient } from './utils/elasticsearch';
import { processCSVFile } from './services/processor';
import * as validations from './services/validations'; 
import chalk from 'chalk';

async function main() {
    try {
        // Display a simple start log with chalk
        console.log(chalk.blue('\n============================================='));
        console.log(chalk.bold.blue('      CSV Processor Starting... 🚀'));
        console.log(chalk.blue('=============================================\n'));

        // Setup configuration from CLI arguments
        const { config, filePath } = setupCLI();
        
        if (!filePath) {
            console.error('Error: No input file specified');
            process.exit(1);
        }

        // Validate file existence and readability
        const fileValid = await validations.validateFile(filePath);
        if (!fileValid) {
            process.exit(1);
        }

        // Validate batch size
        const batchSizeValid =  validations.validateBatchSize(config.batchSize);
        if (!batchSizeValid) {
            process.exit(1);
        }

        // Validate delimiter
        const delimiterValid =  validations.validateDelimiter(config.delimiter);
        if (!delimiterValid) {
            process.exit(1);
        }

        // Initialize Elasticsearch client
        const client = createClient(config);

        // Validate Elasticsearch connection
        const connectionValid = await  validations.validateElasticsearchConnection(client, config);
        if (!connectionValid) {
            process.exit(1);
        }

        // Validate Elasticsearch index
        const indexValid = await  validations.validateIndex(client, config.elasticsearch.index);
        if (!indexValid) {
            process.exit(1);
        }

        // Process the CSV file
        await processCSVFile(filePath, config, client);
    } catch (error) {
        console.error(chalk.red('Error during processing:'), error);
        process.exit(1);
    }
}

// Start processing
main();