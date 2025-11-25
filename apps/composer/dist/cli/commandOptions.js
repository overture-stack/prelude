"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PROFILE_DESCRIPTIONS = void 0;
exports.configureCommandOptions = configureCommandOptions;
exports.parseOptions = parseOptions;
// src/cli/commandOptions.ts - Updated with case-insensitive profile matching
const commander_1 = require("commander");
const types_1 = require("../types");
const errors_1 = require("../utils/errors");
const logger_1 = require("../utils/logger");
// Profile descriptions including PostgreSQL
exports.PROFILE_DESCRIPTIONS = new Map([
    [types_1.Profiles.GENERATE_SONG_SCHEMA, "Generate Song schema from JSON metadata"],
    [
        types_1.Profiles.GENERATE_LECTERN_DICTIONARY,
        "Generate Lectern dictionary from CSV files",
    ],
    [
        types_1.Profiles.GENERATE_ELASTICSEARCH_MAPPING,
        "Generate Elasticsearch mapping from CSV or JSON",
    ],
    [
        types_1.Profiles.GENERATE_ARRANGER_CONFIGS,
        "Generate Arranger configs from Elasticsearch mapping",
    ],
    [
        types_1.Profiles.GENERATE_POSTGRES_TABLE,
        "Generate PostgreSQL CREATE TABLE from CSV file",
    ],
]);
/**
 * Configure CLI command options - separated from parsing logic
 */
function configureCommandOptions(program) {
    logger_1.Logger.debug `Configuring command options`;
    return program
        .name("composer")
        .description("Generate Dictionary, Song Schema, Elasticsearch, or PostgreSQL configurations")
        .argument("[profile]", "Execution profile (optional)")
        .option("--debug", "Enable debug logging")
        .addOption(new commander_1.Option("-p, --profile <profile>", "Execution profile (alternative to positional argument)")
        .choices(Object.values(types_1.Profiles))
        .argParser((value) => {
        // Find matching profile (case-insensitive)
        const matchingProfile = Object.values(types_1.Profiles).find((profile) => profile.toLowerCase() === value.toLowerCase());
        if (!matchingProfile) {
            // UPDATED: Use ErrorFactory with formatted suggestions
            const suggestions = Array.from(exports.PROFILE_DESCRIPTIONS.entries()).map(([profile, desc]) => `  ▸ ${profile}: ${desc}`);
            throw errors_1.ErrorFactory.args(`Invalid profile: ${value}`, [
                "Valid profiles are (case-insensitive):\n",
                ...suggestions,
            ]);
        }
        return matchingProfile;
    }))
        .requiredOption("-f, --files <paths...>", "Input file paths (CSV or JSON, space separated)")
        .option("-i, --index <n>", "Elasticsearch index name", "data")
        .option("--shards <number>", "Number of Elasticsearch shards", "1")
        .option("--replicas <number>", "Number of Elasticsearch replicas", "1")
        .option("-o, --output <path>", "Output file path for generated schemas or mapping")
        .option("--arranger-doc-type <type>", "Arranger document type", "file")
        .option("-n, --name <n>", "Dictionary/Schema name")
        .option("-d, --description <text>", "Dictionary description", "Generated dictionary from CSV files")
        .option("-v, --version <version>", "Dictionary version", "1.0.0")
        .option("--file-types <types...>", "Allowed file types for Song schema")
        .option("--delimiter <char>", "CSV delimiter", ",")
        .option("--ignore-fields <fields...>", "Field names to exclude from Elasticsearch mapping")
        .option("--skip-metadata", "Skip adding submission metadata to Elasticsearch mapping")
        // PostgreSQL options
        .option("--table-name <n>", "PostgreSQL table name")
        .option("--force", "Force overwrite of existing files without prompting")
        .helpOption(false) // Disable default help option
        .option("-h, --help", "display help for command")
        .on("option:help", () => {
        // Show only our custom reference commands
        logger_1.Logger.showReferenceCommands();
        process.exit(0);
    })
        .hook("preAction", (thisCommand) => {
        const opts = thisCommand.opts();
        if (opts.debug) {
            logger_1.Logger.enableDebug();
            logger_1.Logger.debug `Full command options: ${JSON.stringify(opts, null, 2)}`;
        }
    });
}
/**
 * Parse command line arguments into structured CLIOutput
 */
function parseOptions(opts) {
    logger_1.Logger.debug `Parsing command line arguments`;
    // Build elasticsearch config
    const elasticsearchConfig = {
        index: opts.index || "data",
        shards: parseInt(opts.shards || "1", 10),
        replicas: parseInt(opts.replicas || "1", 10),
        ignoredFields: opts.ignoreFields || [],
        skipMetadata: opts.skipMetadata || false,
    };
    // Build dictionary config if needed
    const dictionaryConfig = opts.name || opts.description || opts.version
        ? {
            name: opts.name || "lectern_dictionary",
            description: opts.description || "Generated dictionary from CSV files",
            version: opts.version || "1.0.0",
        }
        : undefined;
    // Build song config if needed
    const songConfig = opts.name || opts.fileTypes
        ? {
            name: opts.name,
            fileTypes: opts.fileTypes,
        }
        : undefined;
    // Build postgres config if needed
    const postgresConfig = opts.tableName
        ? {
            tableName: opts.tableName || "generated_table",
        }
        : undefined;
    const output = {
        profile: opts.profile,
        debug: opts.debug || false,
        filePaths: opts.files || [],
        outputPath: opts.output,
        force: opts.force || false,
        elasticsearchConfig,
        csvDelimiter: opts.delimiter || ",",
        envConfig: {}, // Will be populated by environment loader
        dictionaryConfig,
        songConfig,
        postgresConfig,
        arrangerConfig: opts.arrangerDocType
            ? {
                documentType: opts.arrangerDocType,
            }
            : undefined,
    };
    if (opts.debug) {
        logger_1.Logger.debug `Parsed CLI output: ${JSON.stringify(output, null, 2)}`;
    }
    return output;
}
//# sourceMappingURL=commandOptions.js.map