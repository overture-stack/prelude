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
exports.ArrangerCommand = void 0;
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const baseCommand_1 = require("./baseCommand");
const errors_1 = require("../utils/errors"); // UPDATED: Import ErrorFactory
const generateArrangerConfigs_1 = require("../services/generateArrangerConfigs");
const logger_1 = require("../utils/logger");
const paths_1 = require("../utils/paths");
/**
 * Command implementation for generating Arranger configurations
 * Takes an Elasticsearch mapping file as input and generates the required
 * configuration files for setting up Arranger
 */
class ArrangerCommand extends baseCommand_1.Command {
    constructor() {
        super("Arranger", paths_1.CONFIG_PATHS.arranger.dir);
        // Define arranger-specific defaults
        this.defaultOutputFileName = "configs";
        // Override the default filename from the base class
        this.defaultOutputFileName = "configs";
    }
    /**
     * Override isUsingDefaultPath to handle arranger-specific defaults
     */
    isUsingDefaultPath(cliOutput) {
        return (cliOutput.outputPath === paths_1.CONFIG_PATHS.arranger.configs ||
            cliOutput.outputPath ===
                path.join(paths_1.CONFIG_PATHS.arranger.dir, "configs") ||
            super.isUsingDefaultPath(cliOutput));
    }
    /**
     * Validates the command input parameters
     * @param cliOutput The CLI output containing command parameters
     * @throws {ComposerError} If validation fails
     */
    async validate(cliOutput) {
        logger_1.Logger.debug `Starting ArrangerCommand validation`;
        await super.validate(cliOutput);
        // Note: Output path validation is handled by base class which sets defaults
        // Ensure only one mapping file is provided
        if (cliOutput.filePaths.length !== 1) {
            logger_1.Logger.debug `Invalid number of mapping files: ${cliOutput.filePaths.length}`;
            // UPDATED: Use ErrorFactory with helpful suggestions
            throw errors_1.ErrorFactory.args("You must provide exactly one mapping file", [
                "Arranger config generation requires a single Elasticsearch mapping file",
                "Example: -f elasticsearch-mapping.json",
                "Use the ElasticsearchMapping profile first to generate a mapping file",
            ]);
        }
        const validDocumentTypes = ["file", "analysis"];
        const documentType = cliOutput.arrangerConfig?.documentType;
        logger_1.Logger.debug `Validating document type: ${documentType}`;
        if (!documentType || !validDocumentTypes.includes(documentType)) {
            logger_1.Logger.debug `Invalid document type: ${documentType}`;
            // UPDATED: Use ErrorFactory with helpful suggestions
            throw errors_1.ErrorFactory.args(`Invalid document type. Must be one of: ${validDocumentTypes.join(", ")}`, [
                "Use --arranger-doc-type to specify the document type",
                "Example: --arranger-doc-type file",
                "Example: --arranger-doc-type analysis",
            ]);
        }
        // Warn if using default document type ("file")
        if (documentType === "file") {
            logger_1.Logger.defaultValueInfo(`Using default Arranger document type: "file"`, "Use --arranger-doc-type <type> to specify a different document type (file or analysis).");
        }
        const filePath = cliOutput.filePaths[0];
        const fileExtension = path.extname(filePath).toLowerCase();
        logger_1.Logger.debug `Validating file extension: ${fileExtension}`;
        if (fileExtension !== ".json") {
            logger_1.Logger.debug `File extension validation failed - not JSON`;
            // UPDATED: Use ErrorFactory with helpful suggestions
            throw errors_1.ErrorFactory.file("Arranger configs require a JSON mapping file", filePath, [
                "Ensure the input is an Elasticsearch mapping file in JSON format",
                "Use the ElasticsearchMapping profile to generate a mapping first",
                "Example: composer -p ElasticsearchMapping -f data.csv -o mapping.json",
            ]);
        }
        if (!fs.existsSync(filePath)) {
            logger_1.Logger.debug `File not found at path: ${filePath}`;
            // UPDATED: Use ErrorFactory with helpful suggestions
            throw errors_1.ErrorFactory.file(`File not found: ${filePath}`, filePath, [
                "Check that the mapping file exists",
                "Verify the file path is correct",
                "Ensure you have read permissions for the file",
            ]);
        }
        logger_1.Logger.debug `ArrangerCommand validation completed successfully`;
    }
    /**
     * Executes the command to generate Arranger configurations
     * @param cliOutput The CLI output containing command parameters
     * @returns The generated configurations
     * @throws {ComposerError} If generation fails
     */
    async execute(cliOutput) {
        logger_1.Logger.debug `Starting ArrangerCommand execution`;
        let outputPath = cliOutput.outputPath;
        // Normalize output path for arranger config files
        if (fs.existsSync(outputPath) && fs.statSync(outputPath).isDirectory()) {
            outputPath = path.join(outputPath, this.defaultOutputFileName);
            logger_1.Logger.debug `Output is a directory, will create ${this.defaultOutputFileName} inside it`;
        }
        const filePath = cliOutput.filePaths[0];
        try {
            logger_1.Logger.info `Reading mapping file`;
            logger_1.Logger.debug `Reading file from path: ${filePath}`;
            const mappingContent = fs.readFileSync(filePath, "utf-8");
            let mapping;
            try {
                logger_1.Logger.debug `Parsing JSON mapping content`;
                mapping = JSON.parse(mappingContent);
            }
            catch (error) {
                logger_1.Logger.debug `JSON parsing failed: ${error}`;
                // UPDATED: Use ErrorFactory with helpful suggestions
                throw errors_1.ErrorFactory.file("Invalid JSON mapping file", filePath, [
                    "Ensure the mapping file contains valid JSON",
                    "Check for syntax errors like missing commas or brackets",
                    "Verify the file is a proper Elasticsearch mapping",
                    "Use a JSON validator to check the file format",
                ]);
            }
            // Ensure output directory exists
            const outputDir = path.dirname(outputPath);
            this.createDirectoryIfNotExists(outputDir);
            logger_1.Logger.debug `Generating Arranger configurations`;
            const configs = (0, generateArrangerConfigs_1.ArrangerConfigs)(mapping, cliOutput.elasticsearchConfig?.index // Access elasticsearch config directly
            );
            // Write each configuration to a separate file
            const baseFilePath = path.join(outputDir, "base.json");
            const extendedFilePath = path.join(outputDir, "extended.json");
            const tableFilePath = path.join(outputDir, "table.json");
            const facetsFilePath = path.join(outputDir, "facets.json");
            fs.writeFileSync(baseFilePath, JSON.stringify(configs.base, null, 2));
            fs.writeFileSync(extendedFilePath, JSON.stringify(configs.extended, null, 2));
            fs.writeFileSync(tableFilePath, JSON.stringify(configs.table, null, 2));
            fs.writeFileSync(facetsFilePath, JSON.stringify(configs.facets, null, 2));
            logger_1.Logger.debug `Configuration generation completed`;
            logger_1.Logger.success `Configuration files saved to:`;
            logger_1.Logger.generic(`    - ${baseFilePath}`);
            logger_1.Logger.generic(`    - ${extendedFilePath}`);
            logger_1.Logger.generic(`    - ${tableFilePath}`);
            logger_1.Logger.generic(`    - ${facetsFilePath}`);
            return configs;
        }
        catch (error) {
            logger_1.Logger.debug `Error during execution: ${error}`;
            if (error instanceof Error && error.name === "ComposerError") {
                logger_1.Logger.errorString(error.message);
                throw error;
            }
            // UPDATED: Use ErrorFactory
            throw errors_1.ErrorFactory.generation("Failed to generate Arranger configurations", error, [
                "Check that the mapping file is a valid Elasticsearch mapping",
                "Ensure the output directory is writable",
                "Verify the JSON structure matches expected format",
                "Check file permissions and disk space",
            ]);
        }
    }
}
exports.ArrangerCommand = ArrangerCommand;
//# sourceMappingURL=arrangerCommand.js.map