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
exports.Command = void 0;
const errors_1 = require("../utils/errors"); // UPDATED: Import from utils/errors
const logger_1 = require("../utils/logger");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const fileValidator_1 = require("../validations/fileValidator");
const readline = __importStar(require("readline"));
const fileUtils_1 = require("../utils/fileUtils");
/**
 * Abstract base class for all CLI commands.
 * Provides common functionality for command execution, validation, and file handling.
 */
class Command {
    /**
     * Creates a new Command instance.
     *
     * @param name - Name of the command for logging and identification
     * @param defaultOutputPath - Optional custom default output directory
     */
    constructor(name, defaultOutputPath) {
        this.name = name;
        /** Default filename for output files */
        this.defaultOutputFileName = "output.json";
        this.defaultOutputPath = defaultOutputPath || "configs";
    }
    /**
     * Main method to run the command with the provided CLI arguments.
     * Handles validation, output path resolution, and error handling.
     *
     * @param cliOutput - The parsed command line arguments
     * @returns A promise that resolves when command execution is complete
     */
    async run(cliOutput) {
        const startTime = Date.now();
        try {
            // Enable debug logging if requested
            if (cliOutput.debug) {
                logger_1.Logger.enableDebug();
                logger_1.Logger.debug `Running ${this.name} command with debug enabled`;
            }
            logger_1.Logger.header(`♫ Generating ${this.name} Configurations`);
            // Validate input arguments
            await this.validate(cliOutput);
            logger_1.Logger.debug `Output path before check: ${cliOutput.outputPath}`;
            let usingDefaultPath = false;
            // If no output path specified, use the default
            if (!cliOutput.outputPath?.trim()) {
                logger_1.Logger.debug `No output directory specified`;
                usingDefaultPath = true;
                cliOutput.outputPath = path.join(this.defaultOutputPath);
            }
            const isDefaultPath = this.isUsingDefaultPath(cliOutput);
            // Inform user about output path
            if (isDefaultPath || usingDefaultPath) {
                logger_1.Logger.defaultValueInfo(`Using default output path: ${cliOutput.outputPath}`, "Use -o or --output <path> to specify a different location");
            }
            else {
                logger_1.Logger.debug `Output directory set to: ${cliOutput.outputPath}`;
            }
            // Check for existing files and confirm overwrite if needed
            // Skip confirmation if force flag is set
            if (cliOutput.outputPath && cliOutput.force !== true) {
                const shouldContinue = await this.checkForExistingFiles(cliOutput.outputPath);
                if (!shouldContinue) {
                    logger_1.Logger.infoString("Operation cancelled by user.");
                    return;
                }
            }
            else if (cliOutput.force === true) {
                logger_1.Logger.debug `Force flag enabled, skipping overwrite confirmation`;
            }
            // Execute the specific command implementation
            await this.execute(cliOutput);
        }
        catch (error) {
            (0, errors_1.handleError)(error); // UPDATED: Use consolidated handleError
        }
    }
    /**
     * Checks if the current output path is the default one.
     *
     * @param cliOutput - The parsed command line arguments
     * @returns true if using the default output path, false otherwise
     */
    isUsingDefaultPath(cliOutput) {
        return (cliOutput.outputPath === this.defaultOutputPath ||
            cliOutput.outputPath ===
                path.join(this.defaultOutputPath, this.defaultOutputFileName));
    }
    /**
     * Validates command line arguments.
     * Ensures that input files exist and validates any specified delimiter.
     *
     * @param cliOutput - The parsed command line arguments
     * @throws ComposerError if validation fails
     */
    async validate(cliOutput) {
        if (!cliOutput.filePaths?.length) {
            // UPDATED: Use ErrorFactory with helpful suggestions
            throw errors_1.ErrorFactory.args("No input files provided", [
                "Use -f or --files to specify input files",
                "Example: -f data.csv metadata.json",
                "Multiple files can be specified: -f file1.csv file2.csv",
            ]);
        }
        // Expand directory paths to file paths
        const originalPaths = [...cliOutput.filePaths];
        const expandedPaths = (0, fileUtils_1.expandDirectoryPaths)(cliOutput.filePaths);
        if (expandedPaths.length === 0) {
            // UPDATED: Use ErrorFactory with helpful suggestions
            throw errors_1.ErrorFactory.args("No valid input files found", [
                "Check that the specified paths exist",
                "Ensure files have the correct extensions",
                "If using directories, ensure they contain supported files",
            ]);
        }
        // If we found more files than were originally specified, log this info
        if (expandedPaths.length > originalPaths.length) {
            logger_1.Logger.info `Found ${expandedPaths.length} files from specified paths`;
        }
        // Replace the original file paths with expanded ones
        cliOutput.filePaths = expandedPaths;
        logger_1.Logger.debug `Expanded file paths: ${cliOutput.filePaths.join(", ")}`;
        // Validate each input file
        for (const filePath of cliOutput.filePaths) {
            await (0, fileValidator_1.validateFile)(filePath);
        }
        // Validate delimiter if provided - access csvDelimiter directly
        if (cliOutput.csvDelimiter) {
            (0, fileValidator_1.validateDelimiter)(cliOutput.csvDelimiter);
        }
    }
    /**
     * Creates a directory if it doesn't already exist.
     *
     * @param dirPath - Path to the directory to create
     */
    createDirectoryIfNotExists(dirPath) {
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
            logger_1.Logger.info `Created directory: ${dirPath}`;
        }
    }
    /**
     * Checks if files in the output directory would be overwritten.
     * Prompts the user for confirmation if files would be overwritten.
     *
     * @param outputPath - Path where output files will be written
     * @returns A promise that resolves to true if execution should continue, false otherwise
     */
    async checkForExistingFiles(outputPath) {
        let directoryPath = outputPath;
        let outputFileName;
        // Determine if outputPath is a file or directory
        if (path.extname(outputPath)) {
            logger_1.Logger.debug `Output path appears to be a file: ${outputPath}`;
            directoryPath = path.dirname(outputPath);
            outputFileName = path.basename(outputPath);
            logger_1.Logger.debug `Using directory: ${directoryPath}, fileName: ${outputFileName}`;
        }
        else {
            // If outputPath is a directory, use the default filename
            outputFileName = this.defaultOutputFileName;
            logger_1.Logger.debug `Output path is a directory, using default filename: ${outputFileName}`;
        }
        // Create the output directory if it doesn't exist
        this.createDirectoryIfNotExists(directoryPath);
        // Get existing entries in the directory
        const existingEntries = fs.existsSync(directoryPath)
            ? fs.readdirSync(directoryPath)
            : [];
        // Check for exact file match only
        const filesToOverwrite = existingEntries.filter((entry) => {
            const fullPath = path.join(directoryPath, entry);
            // Only check if this exact file exists and is a file (not a directory)
            return entry === outputFileName && fs.statSync(fullPath).isFile();
        });
        // If no files would be overwritten, continue without prompting
        if (filesToOverwrite.length === 0) {
            return true;
        }
        // Display list of files that would be overwritten
        logger_1.Logger.fileList("The following file(s) in the output directory will be overwritten", filesToOverwrite);
        // Create readline interface for user input
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });
        // Prompt user for confirmation
        return new Promise((resolve) => {
            rl.question(logger_1.Logger.input("Do you wish to continue? [y/n]: "), (answer) => {
                rl.close();
                resolve(answer.toLowerCase() === "y");
            });
        });
    }
    /**
     * Logs information about a generated file.
     *
     * @param filePath - Path to the generated file
     */
    logGeneratedFile(filePath) {
        logger_1.Logger.info `Generated file: ${filePath}`;
    }
}
exports.Command = Command;
//# sourceMappingURL=baseCommand.js.map