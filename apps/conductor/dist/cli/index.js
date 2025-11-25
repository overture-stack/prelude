"use strict";
// src/cli/index.ts - Simplified CLI setup using new configuration system
// Updated to use error factory pattern for consistent error handling
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupCLI = void 0;
const commander_1 = require("commander");
const options_1 = require("./options");
const options_2 = require("./options");
const serviceConfigManager_1 = require("../config/serviceConfigManager");
const environment_1 = require("../validations/environment");
const logger_1 = require("../utils/logger");
const errors_1 = require("../utils/errors");
/**
 * Sets up the CLI environment and parses command-line arguments.
 * Now uses the simplified configuration system with enhanced error handling.
 */
async function setupCLI() {
    const program = new commander_1.Command();
    try {
        logger_1.Logger.debug `Conductor CLI`;
        // Configure command options
        (0, options_2.configureCommandOptions)(program);
        logger_1.Logger.debug `Raw arguments: ${process.argv.join(" ")}`;
        program.parse(process.argv);
        // Get the command
        const commandName = program.args[0];
        if (!commandName) {
            throw errors_1.ErrorFactory.args("No command specified", [
                "Specify a command to run",
                "Use 'conductor --help' to see available commands",
                "Example: conductor upload -f data.csv",
            ]);
        }
        // Get the specific command
        const command = program.commands.find((cmd) => cmd.name() === commandName);
        if (!command) {
            throw errors_1.ErrorFactory.args(`Unknown command: ${commandName}`, [
                "Use 'conductor --help' to see available commands",
                "Check the command spelling",
                "Ensure you're using the correct command name",
            ]);
        }
        // Extract options for the specific command
        const options = command.opts();
        logger_1.Logger.debug `Parsed options: ${JSON.stringify(options, null, 2)}`;
        logger_1.Logger.debug `Remaining arguments: ${program.args.join(", ")}`;
        // Determine the profile based on the command name
        let profile = "upload"; // Default to upload
        switch (commandName) {
            case "upload":
                profile = "upload";
                break;
            case "lecternUpload":
                profile = "lecternUpload";
                break;
            case "lyricRegister":
                profile = "lyricRegister";
                break;
            case "lyricUpload":
                profile = "lyricUpload";
                break;
            case "maestroIndex":
                profile = "maestroIndex";
                break;
            case "songUploadSchema":
                profile = "songUploadSchema";
                break;
            case "songCreateStudy":
                profile = "songCreateStudy";
                break;
            case "songSubmitAnalysis":
                profile = "songSubmitAnalysis";
                break;
            case "songPublishAnalysis":
                profile = "songPublishAnalysis";
                break;
            case "esupload":
                profile = "esupload";
                break;
            case "dbupload":
                profile = "dbupload";
                break;
            case "indexDb":
                profile = "indexDb";
                break;
            default:
                throw errors_1.ErrorFactory.args(`Unsupported command: ${commandName}`, [
                    "This command is not yet implemented",
                    "Use 'conductor --help' to see available commands",
                    "Check for typos in the command name",
                ]);
        }
        // Create simplified configuration using new system
        const config = createSimplifiedConfig(options);
        // Parse command-line arguments into CLIOutput
        const cliOutput = (0, options_1.parseCommandLineArgs)({
            ...options,
            profile,
            // Ensure schema file is added to filePaths for relevant uploads
            ...(options.schemaFile ? { file: options.schemaFile } : {}),
            // Ensure analysis file is added to filePaths for SONG analysis submission
            ...(options.analysisFile ? { file: options.analysisFile } : {}),
        });
        // Override with simplified config
        cliOutput.config = config;
        // Validate environment for services that need it
        // Skip validation for services that don't use Elasticsearch
        const skipElasticsearchValidation = [
            "lecternUpload",
            "lyricRegister",
            "lyricUpload",
            "songUploadSchema",
            "songCreateStudy",
            "songSubmitAnalysis",
            "songPublishAnalysis",
            "dbupload", // PostgreSQL upload doesn't require Elasticsearch
        ];
        if (!skipElasticsearchValidation.includes(profile)) {
            try {
                await (0, environment_1.validateEnvironment)({
                    elasticsearchUrl: cliOutput.config.elasticsearch.url,
                });
            }
            catch (error) {
                throw errors_1.ErrorFactory.environment("Environment validation failed", { profile, originalError: error }, [
                    "Check Elasticsearch configuration",
                    "Verify service URLs are accessible",
                    "Use --debug for detailed error information",
                ]);
            }
        }
        logger_1.Logger.debug `CLI setup completed successfully`;
        return cliOutput;
    }
    catch (error) {
        // If it's already a ConductorError, rethrow it
        if (error instanceof Error && error.name === "ConductorError") {
            throw error;
        }
        // Wrap unexpected errors
        throw errors_1.ErrorFactory.args("CLI setup failed", [
            "Check command line arguments",
            "Use --help for usage information",
            "Use --debug for detailed error information",
        ]);
    }
}
exports.setupCLI = setupCLI;
/**
 * Create simplified configuration using the new configuration system
 */
function createSimplifiedConfig(options) {
    var _a, _b;
    try {
        // Parse host:port for Elasticsearch
        const parseHostPort = (hostPort, defaultHost, defaultPort) => {
            if (hostPort.includes(':')) {
                const [host, port] = hostPort.split(':');
                return { host, port: parseInt(port) || parseInt(defaultPort) };
            }
            return { host: hostPort, port: parseInt(defaultPort) };
        };
        const esHostPort = parseHostPort(options.esHost || process.env.ES_HOST || "localhost:9200", "localhost", "9200");
        // Build Elasticsearch URL
        const esUrl = esHostPort.port === 443 || esHostPort.port === 9243
            ? `https://${esHostPort.host}:${esHostPort.port}`
            : `http://${esHostPort.host}:${esHostPort.port}`;
        // Get base configurations from the new system
        const esConfig = serviceConfigManager_1.ServiceConfigManager.createElasticsearchConfig({
            url: process.env.ELASTICSEARCH_URL || esUrl,
            user: options.esUser || options.user || "elastic",
            password: options.esPass || options.password || "myelasticpassword",
            index: options.index || options.indexName || undefined,
            batchSize: options.batchSize ? parseInt(options.batchSize, 10) : 100,
            delimiter: options.delimiter || `,`,
        });
        const lecternConfig = serviceConfigManager_1.ServiceConfigManager.createLecternConfig({
            url: options.lecternUrl || undefined,
            authToken: options.authToken || undefined,
        });
        const lyricConfig = serviceConfigManager_1.ServiceConfigManager.createLyricConfig({
            url: options.lyricUrl || undefined,
            categoryId: options.categoryId || undefined,
            organization: options.organization || undefined,
            maxRetries: options.maxRetries ? parseInt(options.maxRetries) : undefined,
            retryDelay: options.retryDelay ? parseInt(options.retryDelay) : undefined,
        });
        const songConfig = serviceConfigManager_1.ServiceConfigManager.createSongConfig({
            url: options.songUrl || undefined,
            authToken: options.authToken || undefined,
        });
        const scoreConfig = serviceConfigManager_1.ServiceConfigManager.createScoreConfig({
            url: options.scoreUrl || undefined,
            authToken: options.authToken || undefined,
        });
        const maestroConfig = serviceConfigManager_1.ServiceConfigManager.createMaestroConfig({
            url: options.indexUrl || undefined,
        });
        // Build the simplified config object
        return {
            elasticsearch: {
                url: esConfig.url,
                user: esConfig.user,
                password: esConfig.password,
                index: esConfig.index,
                templateFile: options.templateFile,
                templateName: options.templateName,
                alias: options.aliasName,
            },
            lectern: {
                url: lecternConfig.url,
                authToken: lecternConfig.authToken,
            },
            lyric: {
                url: lyricConfig.url,
                categoryName: options.categoryName || "conductor-category",
                dictionaryName: options.dictName,
                dictionaryVersion: options.dictionaryVersion,
                defaultCentricEntity: options.defaultCentricEntity,
                dataDirectory: options.dataDirectory,
                categoryId: lyricConfig.categoryId,
                organization: lyricConfig.organization,
                maxRetries: lyricConfig.maxRetries,
                retryDelay: lyricConfig.retryDelay,
            },
            song: {
                url: songConfig.url,
                authToken: songConfig.authToken,
                schemaFile: options.schemaFile,
                studyId: options.studyId || "demo",
                studyName: options.studyName || "string",
                organization: options.organization || lyricConfig.organization,
                description: options.description || "string",
                analysisFile: options.analysisFile,
                allowDuplicates: options.allowDuplicates || false,
                ignoreUndefinedMd5: options.ignoreUndefinedMd5 || false,
                // Combined Score functionality
                scoreUrl: scoreConfig.url,
                dataDir: options.dataDir || "./data",
                outputDir: options.outputDir || "./output",
                manifestFile: options.manifestFile,
            },
            maestroIndex: {
                url: maestroConfig.url,
                repositoryCode: options.repositoryCode,
                organization: options.organization,
                id: options.id,
            },
            postgresql: {
                host: ((_a = options.dbHost) === null || _a === void 0 ? void 0 : _a.split(':')[0]) || options.pgHost || "localhost",
                port: parseInt(((_b = options.dbHost) === null || _b === void 0 ? void 0 : _b.split(':')[1]) || options.pgPort || "5435"),
                database: options.dbName || options.pgDatabase || "overtureDb",
                user: options.dbUser || options.pgUsername || "admin",
                username: options.dbUser || options.pgUsername || "admin",
                password: options.dbPass || options.pgPassword || "admin123",
                table: options.table || options.pgTable || "data",
                addMetadata: true,
            },
            batchSize: esConfig.batchSize,
            delimiter: esConfig.delimiter,
        };
    }
    catch (error) {
        throw errors_1.ErrorFactory.validation("Configuration creation failed", { options, originalError: error }, [
            "Check command line arguments",
            "Verify configuration values are valid",
            "Use --help for parameter information",
        ]);
    }
}
