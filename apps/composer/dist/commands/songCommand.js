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
exports.SongCommand = void 0;
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const baseCommand_1 = require("./baseCommand");
const errors_1 = require("../utils/errors"); // UPDATED: Import ErrorFactory
const generateSongSchema_1 = require("../services/generateSongSchema");
const validations_1 = require("../validations");
const types_1 = require("../types");
const logger_1 = require("../utils/logger");
const paths_1 = require("../utils/paths");
class SongCommand extends baseCommand_1.Command {
    constructor() {
        super("Song Schema", paths_1.CONFIG_PATHS.song.dir);
    }
    sanitizeSchemaName(name) {
        const sanitized = name
            .replace(/\s+/g, "_") // Replace spaces with underscores
            .replace(/[^\w-]/g, "") // Remove non-word chars (except hyphens)
            .replace(/^[^a-zA-Z]+/, "") // Remove leading non-letters
            .replace(/^$/, "schema"); // Use 'schema' if empty after sanitization
        if (sanitized !== name) {
            logger_1.Logger.warn `Schema name "${name}" will be sanitized to "${sanitized}"`;
        }
        return sanitized;
    }
    /**
     * Override isUsingDefaultPath to handle Song schema-specific defaults
     */
    isUsingDefaultPath(cliOutput) {
        return (cliOutput.outputPath === paths_1.CONFIG_PATHS.song.schema ||
            cliOutput.outputPath ===
                path.join(paths_1.CONFIG_PATHS.song.dir, "songSchema.json") ||
            super.isUsingDefaultPath(cliOutput));
    }
    async validate(cliOutput) {
        logger_1.Logger.debug `Starting SongCommand validation`;
        await super.validate(cliOutput);
        // Ensure only one JSON file is provided
        if (cliOutput.filePaths.length !== 1) {
            logger_1.Logger.debug `Invalid number of JSON files: ${cliOutput.filePaths.length}`;
            // UPDATED: Use ErrorFactory with helpful suggestions
            throw errors_1.ErrorFactory.args("You must provide exactly one JSON file", [
                "Song schema generation requires a single JSON input file",
                "Example: -f sample-data.json",
                "Multiple files are not supported for Song schema generation",
            ]);
        }
        if (!cliOutput.outputPath) {
            logger_1.Logger.debug `Output path validation failed`;
            // UPDATED: Use ErrorFactory with helpful suggestions
            throw errors_1.ErrorFactory.args("Output path is required", [
                "Use -o or --output to specify where to save the schema",
                "Example: -o song-schema.json",
                "The output will be a JSON schema file",
            ]);
        }
        // Validate and sanitize schema name if provided
        if (cliOutput.songConfig?.name) {
            this.sanitizeSchemaName(cliOutput.songConfig.name);
        }
        // Validate file type and accessibility
        const filePath = cliOutput.filePaths[0];
        const fileExtension = path.extname(filePath).toLowerCase();
        logger_1.Logger.debug `Validating file extension: ${fileExtension}`;
        if (fileExtension !== ".json") {
            logger_1.Logger.debug `File extension validation failed - not JSON`;
            // UPDATED: Use ErrorFactory with helpful suggestions
            throw errors_1.ErrorFactory.file("Song schema generation requires a JSON input file", filePath, [
                "Ensure the input file has a .json extension",
                "The file should contain sample metadata in JSON format",
                "Example: sample-metadata.json",
            ]);
        }
        const fileValid = await (0, validations_1.validateFile)(filePath);
        if (!fileValid) {
            logger_1.Logger.debug `File not found or invalid: ${filePath}`;
            // UPDATED: Use ErrorFactory with helpful suggestions
            throw errors_1.ErrorFactory.file(`Invalid file ${filePath}`, filePath, [
                "Check that the file exists and is readable",
                "Ensure the JSON file is properly formatted",
                "Verify file permissions allow reading",
            ]);
        }
        logger_1.Logger.debug `SongCommand validation completed successfully`;
    }
    async execute(cliOutput) {
        logger_1.Logger.debug `Starting SongCommand execution`;
        const outputPath = cliOutput.outputPath;
        const filePath = cliOutput.filePaths[0];
        try {
            logger_1.Logger.info `Reading JSON input: ${path.basename(filePath)}`;
            const fileContent = fs.readFileSync(filePath, "utf-8");
            let sampleData;
            try {
                sampleData = JSON.parse(fileContent);
            }
            catch (error) {
                logger_1.Logger.debug `JSON parsing failed: ${error}`;
                // UPDATED: Use ErrorFactory with helpful suggestions
                throw errors_1.ErrorFactory.file("Invalid JSON file", filePath, [
                    "Ensure the file contains valid JSON syntax",
                    "Check for missing quotes, commas, or brackets",
                    "Use a JSON validator to verify the format",
                ]);
            }
            // Validate JSON structure - only require experiment object
            if (!sampleData || !sampleData.experiment) {
                logger_1.Logger.debug `Invalid JSON structure - missing experiment object`;
                // UPDATED: Use ErrorFactory with helpful suggestions
                throw errors_1.ErrorFactory.validation("JSON must contain an experiment object", { providedKeys: Object.keys(sampleData || {}) }, [
                    "Ensure the JSON has an 'experiment' property",
                    "The experiment object should contain sample metadata",
                ]);
            }
            // Determine schema name
            const schemaName = cliOutput.songConfig?.name
                ? this.sanitizeSchemaName(cliOutput.songConfig.name)
                : this.sanitizeSchemaName(path.basename(filePath, path.extname(filePath)));
            logger_1.Logger.debug `Using schema name: ${schemaName}`;
            // Configure schema options with both fileTypes and externalValidations
            const songOptions = {
                fileTypes: cliOutput.songConfig?.fileTypes || [],
                externalValidations: [],
            };
            if (songOptions.fileTypes.length > 0) {
                logger_1.Logger.debug `Configured file types: ${songOptions.fileTypes.join(", ")}`;
            }
            // Generate and validate schema
            logger_1.Logger.info `Generating schema`;
            const songSchema = (0, generateSongSchema_1.SongSchema)(sampleData, schemaName, songOptions);
            logger_1.Logger.debug `Validating generated schema`;
            if (!(0, generateSongSchema_1.validateSongSchema)(songSchema)) {
                logger_1.Logger.debug `Generated schema validation failed`;
                // UPDATED: Use ErrorFactory with helpful suggestions
                throw errors_1.ErrorFactory.validation("Generated schema validation failed", { schemaName }, [
                    "Check that the input JSON contains valid experiment data",
                    "Ensure all required fields are present",
                    "Verify the schema structure meets SONG requirements",
                ]);
            }
            // Ensure output directory exists
            await (0, validations_1.validateEnvironment)({
                profile: types_1.Profiles.GENERATE_SONG_SCHEMA,
                outputPath: outputPath,
            });
            // Write schema to file
            fs.writeFileSync(outputPath, JSON.stringify(songSchema, null, 2));
            logger_1.Logger.success `Schema template saved to ${outputPath}`;
            logger_1.Logger.warnString("Remember to update your schema with any specific validation requirements, including fileTypes and externalValidations options.");
        }
        catch (error) {
            logger_1.Logger.debug `Error during execution: ${error}`;
            if (error instanceof Error && error.name === "ComposerError") {
                throw error;
            }
            // UPDATED: Use ErrorFactory
            throw errors_1.ErrorFactory.generation("Error generating SONG schema", error, [
                "Check that the input JSON file is valid",
                "Ensure the output directory is writable",
                "Verify the JSON contains required experiment data",
                "Check file permissions and disk space",
            ]);
        }
    }
}
exports.SongCommand = SongCommand;
//# sourceMappingURL=songCommand.js.map