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
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupCLI = setupCLI;
const commander_1 = require("commander");
const path = __importStar(require("path"));
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
        .option('-m, --mode <enum>', 'Either upload, mapping, or arranger', 'upload')
        .requiredOption('-f, --file <path>', 'CSV file path')
        .requiredOption('-i, --index <name>', 'Elasticsearch index name', 'tabular-index')
        .option('-o, --output <file>', 'Output mapping JSON file (required for mapping mode)')
        .option('--arranger-config-dir <path>', 'Directory to output Arranger configuration files (required for arranger mode)')
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
        }
        else {
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
