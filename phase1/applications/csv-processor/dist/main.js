#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const cli_1 = require("./utils/cli");
const elasticsearch_1 = require("./utils/elasticsearch");
const processor_1 = require("./services/processor");
const validations = __importStar(require("./services/validations"));
const chalk_1 = __importDefault(require("chalk"));
async function main() {
    try {
        // Display a simple start log with chalk
        console.log(chalk_1.default.blue('\n============================================='));
        console.log(chalk_1.default.bold.blue('      CSV Processor Starting... 🚀'));
        console.log(chalk_1.default.blue('=============================================\n'));
        // Setup configuration from CLI arguments
        const { config, filePath } = (0, cli_1.setupCLI)();
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
        const batchSizeValid = validations.validateBatchSize(config.batchSize);
        if (!batchSizeValid) {
            process.exit(1);
        }
        // Validate delimiter
        const delimiterValid = validations.validateDelimiter(config.delimiter);
        if (!delimiterValid) {
            process.exit(1);
        }
        // Initialize Elasticsearch client
        const client = (0, elasticsearch_1.createClient)(config);
        // Validate Elasticsearch connection
        const connectionValid = await validations.validateElasticsearchConnection(client, config);
        if (!connectionValid) {
            process.exit(1);
        }
        // Validate Elasticsearch index
        const indexValid = await validations.validateIndex(client, config.elasticsearch.index);
        if (!indexValid) {
            process.exit(1);
        }
        // Process the CSV file
        await (0, processor_1.processCSVFile)(filePath, config, client);
    }
    catch (error) {
        console.error(chalk_1.default.red('Error during processing:'), error);
        process.exit(1);
    }
}
// Start processing
main();
