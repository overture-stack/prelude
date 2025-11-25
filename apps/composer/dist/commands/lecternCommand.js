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
exports.DictionaryCommand = void 0;
// src/commands/lecternCommand.ts - Updated to error on explicit mixed file types
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const baseCommand_1 = require("./baseCommand");
const errors_1 = require("../utils/errors");
const generateLecternDictionary_1 = require("../services/generateLecternDictionary");
const csvParser_1 = require("../utils/csvParser");
const validations_1 = require("../validations");
const types_1 = require("../types");
const logger_1 = require("../utils/logger");
const paths_1 = require("../utils/paths");
class DictionaryCommand extends baseCommand_1.Command {
    constructor() {
        super("Lectern Dictionary", paths_1.CONFIG_PATHS?.lectern?.dir);
        // Define dictionary-specific defaults
        this.defaultOutputFileName = "dictionary.json";
        // Override the default filename from the base class
        this.defaultOutputFileName = "dictionary.json";
    }
    /**
     * Override isUsingDefaultPath to handle dictionary-specific defaults
     */
    isUsingDefaultPath(cliOutput) {
        return (cliOutput.outputPath === paths_1.CONFIG_PATHS?.lectern?.dictionary ||
            cliOutput.outputPath ===
                path.join(paths_1.CONFIG_PATHS?.lectern?.dir || "", "dictionary.json") ||
            super.isUsingDefaultPath(cliOutput));
    }
    async validate(cliOutput) {
        await super.validate(cliOutput);
        if (!cliOutput.outputPath) {
            throw errors_1.ErrorFactory.args("Output path is required", [
                "Use -o or --output to specify an output path",
                "Example: -o /path/to/dictionary.json",
            ]);
        }
        // Validate dictionary config
        if (!cliOutput.dictionaryConfig) {
            throw errors_1.ErrorFactory.args("Dictionary configuration is required", [
                "Use --name, --description, or --version to configure the dictionary",
                "Example: --name 'My Dictionary' --version '2.0.0'",
            ]);
        }
        const config = cliOutput.dictionaryConfig;
        if (!config.name) {
            // Set a default value first
            config.name = "lectern_dictionary";
            logger_1.Logger.defaultValueInfo(`No dictionary name supplied, defaulting to: ${config.name}`, "--name <name>");
        }
        // Similar fixes for description and version if needed
        if (config.description === "Generated dictionary from CSV files") {
            logger_1.Logger.defaultValueInfo("No dictionary description supplied, using default description", "--description <text>");
        }
        if (config.version === "1.0.0") {
            logger_1.Logger.defaultValueInfo("No dictionary version supplied, using default version: 1.0.0", "--version <version>");
        }
        // Get only CSV files from the paths (already expanded in base class)
        const csvFiles = cliOutput.filePaths.filter((filePath) => path.extname(filePath).toLowerCase() === ".csv");
        // Check if we've got valid CSV files
        if (csvFiles.length === 0) {
            throw errors_1.ErrorFactory.file("Lectern dictionary generation requires CSV input files", undefined, [
                "Ensure your input files have .csv extension",
                "Check that the files exist and are accessible",
                "Example: -f data.csv metadata.csv",
            ]);
        }
        // UPDATED: Check if user explicitly provided mixed file types
        if (csvFiles.length < cliOutput.filePaths.length) {
            const skippedFiles = cliOutput.filePaths.filter((filePath) => path.extname(filePath).toLowerCase() !== ".csv");
            // If files were explicitly provided (not from directory expansion),
            // this should be an error rather than a warning
            const nonCsvExtensions = skippedFiles.map((file) => path.extname(file).toLowerCase());
            throw errors_1.ErrorFactory.validation("Lectern dictionary generation only supports CSV files", {
                csvFiles,
                skippedFiles,
                unsupportedExtensions: nonCsvExtensions,
                totalProvided: cliOutput.filePaths.length,
                csvCount: csvFiles.length,
            }, [
                "Use only CSV files for Lectern dictionary generation",
                `Found unsupported file types: ${nonCsvExtensions.join(", ")}`,
                "Remove non-CSV files from your file list",
                "Example: -f data.csv metadata.csv (not -f data.csv schema.json)",
                "Use different profiles for different file types:",
            ].concat(skippedFiles.map((file) => `  • For ${file}: use ElasticsearchMapping or SongSchema profile`)));
        }
        logger_1.Logger.info `Processing ${csvFiles.length} CSV files`;
        // Validate CSV headers for each file - use csvDelimiter directly
        const validFiles = [];
        const invalidFiles = [];
        const allInvalidHeaders = [];
        for (const filePath of cliOutput.filePaths) {
            try {
                const csvHeadersValid = await (0, validations_1.validateCSVHeaders)(filePath, cliOutput.csvDelimiter);
                if (csvHeadersValid) {
                    validFiles.push(filePath);
                }
                else {
                    invalidFiles.push(filePath);
                }
            }
            catch (error) {
                // Handle CSV validation errors with proper formatting
                if (error instanceof Error && error.name === "ComposerError") {
                    const composerError = error;
                    if (composerError.details?.invalidHeaders) {
                        // Collect all invalid headers for summary display
                        allInvalidHeaders.push(...composerError.details.invalidHeaders);
                    }
                }
                invalidFiles.push(filePath);
            }
        }
        // Show consolidated validation results
        if (invalidFiles.length > 0) {
            if (allInvalidHeaders.length > 0) {
                // Show unique invalid headers as a warning, not an error
                const uniqueInvalidHeaders = [...new Set(allInvalidHeaders)];
                logger_1.Logger.warnString("The following header(s) are invalid:");
                uniqueInvalidHeaders.forEach((header) => {
                    logger_1.Logger.generic(`  - ${header}`);
                });
            }
            logger_1.Logger.warn `Skipping ${invalidFiles.length} files with invalid headers`;
            invalidFiles.forEach((file) => {
                logger_1.Logger.generic(`  - ${path.basename(file)}`);
            });
            // Update filePaths to only include valid files
            cliOutput.filePaths = validFiles;
        }
        // Ensure we still have files to process
        if (cliOutput.filePaths.length === 0) {
            throw errors_1.ErrorFactory.validation("No valid CSV files found with proper headers", { invalidFiles }, [
                "Check that CSV files have valid column headers",
                "Headers should not contain special characters or be empty",
            ]);
        }
        logger_1.Logger.info `Found ${cliOutput.filePaths.length} valid CSV files to process`;
    }
    async execute(cliOutput) {
        const { dictionaryConfig } = cliOutput;
        const delimiter = cliOutput.csvDelimiter;
        // Get output path, similar to MappingCommand
        let outputPath = cliOutput.outputPath;
        // Normalize output path for dictionary files specifically
        if (fs.existsSync(outputPath) && fs.statSync(outputPath).isDirectory()) {
            outputPath = path.join(outputPath, this.defaultOutputFileName);
            logger_1.Logger.debug `Output is a directory, will create ${this.defaultOutputFileName} inside it`;
        }
        else if (!outputPath.endsWith(".json")) {
            outputPath += ".json";
            logger_1.Logger.info `Adding .json extension to output path`;
        }
        try {
            // Validate environment
            await (0, validations_1.validateEnvironment)({
                profile: types_1.Profiles.GENERATE_LECTERN_DICTIONARY,
                outputPath: outputPath,
            });
            const dictionary = (0, generateLecternDictionary_1.generateDictionary)(dictionaryConfig.name, dictionaryConfig.description, dictionaryConfig.version);
            let processedFiles = 0;
            let skippedFiles = 0;
            for (const filePath of cliOutput.filePaths) {
                try {
                    const fileContent = fs.readFileSync(filePath, "utf-8");
                    const [headerLine, sampleLine] = fileContent.split("\n");
                    if (!headerLine) {
                        logger_1.Logger.warn `CSV file ${path.basename(filePath)} is empty or has no headers. Skipping.`;
                        skippedFiles++;
                        continue;
                    }
                    const headers = (0, csvParser_1.parseCSVLine)(headerLine, delimiter, true)[0];
                    if (!headers) {
                        logger_1.Logger.warn `Failed to parse CSV headers in ${path.basename(filePath)}. Skipping.`;
                        skippedFiles++;
                        continue;
                    }
                    // Process sample data
                    const sampleData = {};
                    if (sampleLine) {
                        const sampleValues = (0, csvParser_1.parseCSVLine)(sampleLine, delimiter, false)[0];
                        if (sampleValues) {
                            headers.forEach((header, index) => {
                                sampleData[header] = sampleValues[index] || "";
                            });
                        }
                    }
                    // Pass the full file path to generateSchema to extract the schema name
                    const schema = (0, generateLecternDictionary_1.generateSchema)(filePath, headers, sampleData);
                    dictionary.schemas.push(schema);
                    logger_1.Logger.debug `Generated schema for ${schema.name}`;
                    processedFiles++;
                }
                catch (error) {
                    logger_1.Logger.warn `Skipping ${path.basename(filePath)} due to error: ${error}`;
                    skippedFiles++;
                    continue;
                }
            }
            // Log summary of processing
            logger_1.Logger.info `Successfully processed ${processedFiles} CSV files`;
            if (skippedFiles > 0) {
                logger_1.Logger.warn `Skipped ${skippedFiles} files due to errors`;
            }
            // Ensure output directory exists
            const outputDir = path.dirname(outputPath);
            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true });
                logger_1.Logger.debug `Created output directory: ${outputDir}`;
            }
            // Write dictionary to file
            fs.writeFileSync(outputPath, JSON.stringify(dictionary, null, 2));
            logger_1.Logger.success `Dictionary saved to ${outputPath}`;
            return dictionary;
        }
        catch (error) {
            if (error instanceof errors_1.ComposerError) {
                throw error;
            }
            throw errors_1.ErrorFactory.generation("Error generating Lectern dictionary", error, [
                "Check that all CSV files are properly formatted",
                "Ensure output directory is writable",
                "Verify file permissions and disk space",
            ]);
        }
    }
}
exports.DictionaryCommand = DictionaryCommand;
//# sourceMappingURL=lecternCommand.js.map