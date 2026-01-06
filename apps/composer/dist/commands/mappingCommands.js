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
exports.MappingCommand = void 0;
// src/commands/mappingCommands.ts - Updated to support Lectern dictionaries
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const baseCommand_1 = require("./baseCommand");
const errors_1 = require("../utils/errors");
const generateEsMappingFromCSV_1 = require("../services/generateEsMappingFromCSV");
const generateEsMappingFromJSON_1 = require("../services/generateEsMappingFromJSON");
const generateESMappingFromLectern_1 = require("../services/generateESMappingFromLectern");
const validations_1 = require("../validations");
const csvParser_1 = require("../utils/csvParser");
const logger_1 = require("../utils/logger");
const paths_1 = require("../utils/paths");
class MappingCommand extends baseCommand_1.Command {
    constructor() {
        super("Elasticsearch Mapping", paths_1.CONFIG_PATHS.elasticsearch.dir);
        // Define mapping-specific defaults
        this.defaultOutputFileName = "mapping.json";
        // Override the default filename from the base class
        this.defaultOutputFileName = "mapping.json";
    }
    /**
     * Recursively count fields in an Elasticsearch mapping
     */
    countFields(properties) {
        let count = 0;
        const recurseCount = (props) => {
            for (const [, field] of Object.entries(props)) {
                count++;
                // Recursively count nested object or nested type properties
                if (field.properties) {
                    recurseCount(field.properties);
                }
            }
        };
        recurseCount(properties);
        return count;
    }
    /**
     * Analyze field types in an Elasticsearch mapping
     */
    analyzeFieldTypes(properties) {
        let topLevelFields = 0;
        let nestedFields = 0;
        const typeDistribution = {};
        const analyzeRecursive = (props, isTopLevel = true) => {
            for (const [, field] of Object.entries(props)) {
                // Count top-level vs nested fields
                if (isTopLevel)
                    topLevelFields++;
                else
                    nestedFields++;
                // Track field types
                const type = field.type;
                typeDistribution[type] = (typeDistribution[type] || 0) + 1;
                // Recursively analyze nested properties
                if (field.properties) {
                    analyzeRecursive(field.properties, false);
                }
            }
        };
        analyzeRecursive(properties);
        return {
            topLevelFields,
            nestedFields,
            typeDistribution,
        };
    }
    /**
     * Detect input file type based on content and extension
     */
    detectFileType(filePath) {
        const extension = path.extname(filePath).toLowerCase();
        if (extension === ".csv") {
            return "csv";
        }
        if (extension === ".json") {
            try {
                const content = fs.readFileSync(filePath, "utf-8");
                const data = JSON.parse(content);
                // Check if it's a Lectern dictionary
                if (data.schemas &&
                    Array.isArray(data.schemas) &&
                    data.name &&
                    data.version) {
                    return "lectern";
                }
                // Otherwise it's a regular JSON file
                return "json";
            }
            catch (error) {
                logger_1.Logger.warn `Error reading JSON file for type detection: ${error}`;
                return "json"; // Default to JSON and let validation catch issues
            }
        }
        return "json"; // Default fallback
    }
    /**
     * Override isUsingDefaultPath to handle mapping-specific defaults
     */
    isUsingDefaultPath(cliOutput) {
        return (cliOutput.outputPath === paths_1.CONFIG_PATHS.elasticsearch.mapping ||
            cliOutput.outputPath ===
                path.join(paths_1.CONFIG_PATHS.elasticsearch.dir, "mapping.json") ||
            super.isUsingDefaultPath(cliOutput));
    }
    async validate(cliOutput) {
        await super.validate(cliOutput);
        // Validate file extensions
        const validExtensions = [".csv", ".json"];
        const invalidFiles = cliOutput.filePaths.filter((filePath) => !validExtensions.includes(path.extname(filePath).toLowerCase()));
        if (invalidFiles.length > 0) {
            throw errors_1.ErrorFactory.file("Invalid file types detected. Only .csv and .json files are supported", undefined, [
                "Ensure all input files have .csv or .json extensions",
                `Invalid files: ${invalidFiles.join(", ")}`,
                "Supported formats: CSV for tabular data, JSON for structured data or Lectern dictionaries",
                "Example: -f data.csv metadata.json dictionary.json",
            ]);
        }
        // For mixed file types, ensure they're compatible
        const fileTypes = cliOutput.filePaths.map((filePath) => this.detectFileType(filePath));
        const uniqueTypes = new Set(fileTypes);
        // Allow CSV files together, JSON files together, or single Lectern dictionary
        if (uniqueTypes.size > 1) {
            const hasLectern = fileTypes.includes("lectern");
            const hasCSV = fileTypes.includes("csv");
            const hasJSON = fileTypes.includes("json");
            if (hasLectern && (hasCSV || hasJSON)) {
                throw errors_1.ErrorFactory.file("Lectern dictionaries must be processed alone, not mixed with other file types", undefined, [
                    "Process Lectern dictionaries separately from CSV/JSON files",
                    "Use one Lectern dictionary file per mapping generation",
                    "Example: -f dictionary.json (for Lectern)",
                    "Example: -f data.csv metadata.csv (for CSV)",
                ]);
            }
            if (hasCSV && hasJSON) {
                throw errors_1.ErrorFactory.file("CSV and JSON files cannot be mixed (except Lectern dictionaries)", undefined, [
                    "Use either all CSV files OR all JSON files, not mixed",
                    "CSV files: for tabular data like spreadsheets",
                    "JSON files: for structured metadata",
                    "Lectern dictionaries: can be processed alone",
                ]);
            }
        }
        // Special validation for Lectern dictionaries
        const lecternFiles = cliOutput.filePaths.filter((filePath) => this.detectFileType(filePath) === "lectern");
        if (lecternFiles.length > 1) {
            throw errors_1.ErrorFactory.file("Only one Lectern dictionary can be processed at a time", undefined, [
                "Use a single Lectern dictionary file",
                "Merge multiple dictionaries before processing if needed",
                "Example: -f combined-dictionary.json",
            ]);
        }
        // Validate index pattern
        if (cliOutput.elasticsearchConfig?.index) {
            if (!/^[a-z0-9][a-z0-9_-]*$/.test(cliOutput.elasticsearchConfig.index)) {
                throw errors_1.ErrorFactory.args("Invalid index pattern. Must start with a letter or number and contain only lowercase letters, numbers, hyphens, and underscores", [
                    "Index names must be lowercase",
                    "Start with a letter or number",
                    "Use only letters, numbers, hyphens, and underscores",
                    "Example: --index my_data_index",
                ]);
            }
        }
    }
    async execute(cliOutput) {
        // Start execution timing
        const startTime = Date.now();
        let outputPath = cliOutput.outputPath;
        // Normalize output path for mapping files specifically
        if (fs.existsSync(outputPath) && fs.statSync(outputPath).isDirectory()) {
            outputPath = path.join(outputPath, this.defaultOutputFileName);
            logger_1.Logger.debug `Output is a directory, will create ${this.defaultOutputFileName} inside it`;
        }
        else if (!outputPath.endsWith(".json")) {
            outputPath += ".json";
            logger_1.Logger.info `Adding .json extension to output path`;
        }
        try {
            // Access elasticsearch config directly from CLIOutput
            const mappingOptions = {
                index_pattern: cliOutput.elasticsearchConfig?.index || "default",
                number_of_shards: cliOutput.elasticsearchConfig?.shards || 1,
                number_of_replicas: cliOutput.elasticsearchConfig?.replicas || 0,
                ignoredFields: cliOutput.elasticsearchConfig?.ignoredFields || [],
                skipMetadata: cliOutput.elasticsearchConfig?.skipMetadata || false,
            };
            logger_1.Logger.debugObject("Mapping options", mappingOptions);
            // Detect file type and generate mapping accordingly
            const firstFilePath = cliOutput.filePaths[0];
            const fileType = this.detectFileType(firstFilePath);
            let finalMapping;
            switch (fileType) {
                case "csv":
                    logger_1.Logger.info `Processing CSV files`;
                    finalMapping = await this.handleCSVMapping(cliOutput.filePaths, cliOutput.csvDelimiter, mappingOptions);
                    break;
                case "lectern":
                    logger_1.Logger.info `Processing Lectern dictionary`;
                    finalMapping = await this.handleLecternMapping(firstFilePath, mappingOptions);
                    break;
                case "json":
                default:
                    logger_1.Logger.info `Processing JSON files`;
                    finalMapping = await this.handleJSONMapping(cliOutput.filePaths, mappingOptions);
                    break;
            }
            // Ensure output directory exists
            const outputDir = path.dirname(outputPath);
            this.createDirectoryIfNotExists(outputDir);
            // Write mapping to file
            fs.writeFileSync(outputPath, JSON.stringify(finalMapping, null, 2));
            // Show summary
            this.logMappingSummary(finalMapping, outputPath, mappingOptions, fileType);
            return finalMapping;
        }
        catch (error) {
            if (error instanceof Error && error.name === "ComposerError") {
                throw error;
            }
            throw errors_1.ErrorFactory.generation("Error generating Elasticsearch mapping", error, [
                "Check that input files are properly formatted",
                "Ensure output directory is writable",
                "Verify file permissions and disk space",
                "For CSV files, check header format and delimiter",
                "For Lectern dictionaries, verify schema structure",
            ]);
        }
    }
    async handleCSVMapping(filePaths, delimiter, options) {
        const allHeaders = new Set();
        const sampleData = {};
        // Track per-file processing
        let processedFileCount = 0;
        for (const filePath of filePaths) {
            const fileStartTime = Date.now();
            logger_1.Logger.info `Processing CSV file: ${path.basename(filePath)}`;
            // Validate CSV structure
            const csvHeadersValid = await (0, validations_1.validateCSVHeaders)(filePath, delimiter);
            if (!csvHeadersValid) {
                throw errors_1.ErrorFactory.file(`CSV file ${filePath} has invalid headers`, filePath, [
                    "Check that the CSV has proper column headers",
                    "Ensure headers don't contain special characters",
                    "Verify the delimiter is correct",
                    "Headers should be unique and non-empty",
                ]);
            }
            // Parse file content
            const fileContent = fs.readFileSync(filePath, "utf-8");
            const [headerLine, sampleLine] = fileContent.split("\n");
            if (!headerLine || !sampleLine) {
                throw errors_1.ErrorFactory.file(`CSV file ${filePath} must contain at least a header row and one data row`, filePath, [
                    "Ensure the CSV has at least 2 rows (headers + data)",
                    "Check that the file is not corrupted",
                    "Verify the CSV format is correct",
                ]);
            }
            // Extract headers and sample data
            const headers = (0, csvParser_1.parseCSVLine)(headerLine, delimiter, true)[0];
            const sampleValues = (0, csvParser_1.parseCSVLine)(sampleLine, delimiter, false)[0];
            if (!headers || !sampleValues) {
                throw errors_1.ErrorFactory.parsing(`Failed to parse CSV headers or sample data in ${filePath}`, { filePath, delimiter }, [
                    "Check that the delimiter is correct",
                    "Ensure the CSV format is valid",
                    "Verify there are no unescaped quotes or special characters",
                ]);
            }
            // Merge headers and sample data
            const originalHeaderCount = allHeaders.size;
            headers.forEach((header, index) => {
                allHeaders.add(header);
                if (!sampleData[header]) {
                    sampleData[header] = sampleValues[index]?.toString() || "";
                }
            });
            const newHeaders = allHeaders.size - originalHeaderCount;
            processedFileCount++;
            logger_1.Logger.debug `Found ${headers.length} fields in ${path.basename(filePath)} (${newHeaders} new fields)`;
            // Show timing for large files
            const fileEndTime = Date.now();
            if (fileEndTime - fileStartTime > 500) {
                logger_1.Logger.timing(`Processed file ${processedFileCount}/${filePaths.length}`, fileEndTime - fileStartTime);
            }
        }
        logger_1.Logger.debug `Total unique fields found: ${allHeaders.size}`;
        return (0, generateEsMappingFromCSV_1.generateMappingFromCSV)(Array.from(allHeaders), sampleData, options.index_pattern || "default", { skipMetadata: options.skipMetadata });
    }
    async handleJSONMapping(filePaths, options) {
        const filePath = filePaths[0];
        logger_1.Logger.info `Processing JSON file: ${path.basename(filePath)}`;
        // Convert from local MappingOptions to JsonMappingOptions
        const jsonOptions = {
            ignoredFields: options.ignoredFields,
            skipMetadata: options.skipMetadata,
        };
        return (0, generateEsMappingFromJSON_1.generateMappingFromJson)(filePath, options.index_pattern || "default", jsonOptions);
    }
    async handleLecternMapping(filePath, options) {
        logger_1.Logger.info `Processing Lectern dictionary: ${path.basename(filePath)}`;
        // Convert from local MappingOptions to LecternMappingOptions
        const lecternOptions = {
            ignoredFields: options.ignoredFields,
            ignoredSchemas: options.ignoredSchemas,
            skipMetadata: options.skipMetadata,
        };
        return (0, generateESMappingFromLectern_1.generateMappingFromLectern)(filePath, options.index_pattern || "default", lecternOptions);
    }
    logMappingSummary(mapping, outputPath, options, sourceType) {
        try {
            // Source type info
            if (sourceType) {
                const sourceTypeNames = {
                    csv: "CSV files",
                    json: "JSON files",
                    lectern: "Lectern dictionary",
                };
                logger_1.Logger.info `Source: ${sourceTypeNames[sourceType] || sourceType}`;
            }
            // Index pattern info
            logger_1.Logger.info `Index Pattern created: ${mapping.index_patterns[0]}`;
            // Aliases info
            const aliasNames = Object.keys(mapping.aliases);
            if (aliasNames.length > 0) {
                logger_1.Logger.info `Alias(es) used: ${aliasNames.join(", ")}`;
            }
            else {
                logger_1.Logger.infoString("No aliases defined");
            }
            // Fields info with count
            const fieldCount = this.countFields(mapping.mappings.properties);
            // Breakdown of field types
            const fieldBreakdown = this.analyzeFieldTypes(mapping.mappings.properties);
            // Log detailed field information
            logger_1.Logger.infoString(`Field Analysis: ${fieldCount} total fields\n` +
                `  • Top-level fields: ${fieldBreakdown.topLevelFields}\n` +
                `  • Nested array fields: ${fieldBreakdown.nestedFields}\n` +
                `  • Field types: ${Object.entries(fieldBreakdown.typeDistribution)
                    .map(([type, count]) => `${count} ${type}`)
                    .join(", ")}`);
            // Metadata skipping info
            if (options.skipMetadata) {
                logger_1.Logger.infoString("Submission metadata excluded from mapping");
            }
            // Shards and replicas
            logger_1.Logger.info `Shards: ${mapping.settings.number_of_shards}`;
            logger_1.Logger.info `Replicas: ${mapping.settings.number_of_replicas}`;
            // Ensure success logging
            logger_1.Logger.successString("Elasticsearch mapping generated successfully");
            // Use generic logging for file path to avoid template literal issues
            logger_1.Logger.generic(`    - Saved to: ${outputPath}`);
        }
        catch (error) {
            // Fallback logging in case of any unexpected errors
            logger_1.Logger.errorString("Error in logging mapping summary");
            logger_1.Logger.debug `${error}`;
        }
    }
}
exports.MappingCommand = MappingCommand;
//# sourceMappingURL=mappingCommands.js.map