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
const mapping_1 = require("./services/mapping");
const arranger_1 = require("./services/arranger");
const chalk_1 = __importDefault(require("chalk"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
async function main() {
    try {
        console.log(chalk_1.default.blue('\n============================================='));
        console.log(chalk_1.default.bold.blue('      CSV Processor Starting... 🚀'));
        console.log(chalk_1.default.blue('=============================================\n'));
        // Setup configuration from CLI arguments
        const { config, filePath, outputPath, mode, arrangerConfigDir } = (0, cli_1.setupCLI)();
        if (!filePath) {
            console.error(chalk_1.default.red('Error: No input file specified'));
            process.exit(1);
        }
        // Common validations for both modes
        const fileValid = await validations.validateFile(filePath);
        if (!fileValid)
            process.exit(1);
        const delimiterValid = validations.validateDelimiter(config.delimiter);
        if (!delimiterValid)
            process.exit(1);
        // Generate Elasticsearch mapping
        const mapping = await (0, mapping_1.validateAndGetMapping)(filePath, config.delimiter);
        // Function to generate and save mapping
        const generateAndSaveMapping = (mapping, outputPath) => {
            fs.writeFileSync(outputPath, JSON.stringify(mapping, null, 2));
            console.log(chalk_1.default.green(`\n✓ Mapping saved to ${outputPath}`));
        };
        // Function to generate and save Arranger configs
        const generateAndSaveArrangerConfigs = (mapping, arrangerConfigDir, indexName) => {
            if (!fs.existsSync(arrangerConfigDir)) {
                fs.mkdirSync(arrangerConfigDir, { recursive: true });
            }
            console.log(chalk_1.default.cyan('\nGenerating Arranger configurations...'));
            const arrangerConfigs = (0, arranger_1.generateArrangerConfigs)(mapping, indexName);
            // Write config files
            const configFiles = [
                { name: 'base.json', content: arrangerConfigs.base },
                { name: 'extended.json', content: arrangerConfigs.extended },
                { name: 'table.json', content: arrangerConfigs.table },
                { name: 'facets.json', content: arrangerConfigs.facets },
            ];
            configFiles.forEach(({ name, content }) => {
                const filePath = path.join(arrangerConfigDir, name);
                fs.writeFileSync(filePath, JSON.stringify(content, null, 2));
                console.log(chalk_1.default.green(`✓ Generated ${name}`));
            });
            console.log(chalk_1.default.green(`\n✓ All Arranger configurations saved to ${arrangerConfigDir}`));
        };
        // Handle different modes
        switch (mode) {
            case 'mapping':
                if (outputPath) {
                    generateAndSaveMapping(mapping, outputPath);
                }
                else {
                    console.log(chalk_1.default.green('\nGenerated Elasticsearch Mapping:\n'), JSON.stringify(mapping, null, 2));
                }
                break;
            case 'arranger':
                if (!arrangerConfigDir) {
                    console.error(chalk_1.default.red('Error: Arranger config directory not specified'));
                    process.exit(1);
                }
                generateAndSaveArrangerConfigs(mapping, arrangerConfigDir, config.elasticsearch.index);
                break;
            case 'all':
                if (!outputPath || !arrangerConfigDir) {
                    console.error(chalk_1.default.red('Error: Both --output and --arranger-config-dir are required for all mode'));
                    process.exit(1);
                }
                // Generate both mapping and Arranger configs
                generateAndSaveMapping(mapping, outputPath);
                generateAndSaveArrangerConfigs(mapping, arrangerConfigDir, config.elasticsearch.index);
                break;
            case 'upload':
                // Validations specific to upload mode
                const batchSizeValid = validations.validateBatchSize(config.batchSize);
                if (!batchSizeValid)
                    process.exit(1);
                // Initialize and validate Elasticsearch
                const client = (0, elasticsearch_1.createClient)(config);
                const connectionValid = await validations.validateElasticsearchConnection(client, config);
                if (!connectionValid)
                    process.exit(1);
                const indexValid = await validations.validateIndex(client, config.elasticsearch.index);
                if (!indexValid)
                    process.exit(1);
                // Process the CSV file
                await (0, processor_1.processCSVFile)(filePath, config, client);
                break;
            default:
                console.error(chalk_1.default.red(`Error: Unknown mode '${mode}'`));
                process.exit(1);
        }
    }
    catch (error) {
        console.error(chalk_1.default.red('\nError during processing:'));
        if (error instanceof Error) {
            console.error(chalk_1.default.red(error.message));
            if (error.stack) {
                console.error(chalk_1.default.gray(error.stack));
            }
        }
        else {
            console.error(chalk_1.default.red(String(error)));
        }
        process.exit(1);
    }
}
// Start processing
main().catch(error => {
    console.error(chalk_1.default.red('Fatal error:'), error);
    process.exit(1);
});
