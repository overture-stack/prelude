"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommandRegistry = void 0;
const types_1 = require("../types");
const logger_1 = require("../utils/logger");
const errors_1 = require("../utils/errors");
// Import command classes
const songCommand_1 = require("./songCommand");
const lecternCommand_1 = require("./lecternCommand");
const mappingCommands_1 = require("./mappingCommands");
const arrangerCommand_1 = require("./arrangerCommand");
const postgresCommand_1 = require("./postgresCommand");
/**
 * Simplified command registry with Lectern dictionary support for mapping generation
 */
class CommandRegistry {
    /**
     * Create a command instance by profile
     */
    static createCommand(profile) {
        const config = this.commands.get(profile);
        if (!config) {
            throw errors_1.ErrorFactory.args(`Unknown profile: ${profile}`, [
                "Available profiles:",
                ...Array.from(this.commands.entries()).map(([p, c]) => `  ${p}: ${c.description}`),
                "Use --help to see all available options",
            ]);
        }
        logger_1.Logger.debug `Creating command: ${config.name}`;
        return config.createCommand();
    }
    /**
     * Create and execute a command in one step
     */
    static async execute(profile, cliOutput) {
        const command = this.createCommand(profile);
        await command.run(cliOutput);
    }
    /**
     * Check if a profile is supported
     */
    static isRegistered(profile) {
        return this.commands.has(profile);
    }
    /**
     * Get all available profiles
     */
    static getAvailableProfiles() {
        return Array.from(this.commands.keys());
    }
    /**
     * Get command configuration by profile
     */
    static getConfig(profile) {
        return this.commands.get(profile);
    }
    /**
     * Validate file types for a given profile
     * Note: For ElasticsearchMapping, Lectern dictionaries are validated by content, not just extension
     */
    static validateFileTypes(profile, filePaths) {
        const config = this.commands.get(profile);
        if (!config) {
            return { valid: false, invalidFiles: filePaths, supportedTypes: [] };
        }
        const path = require("path");
        const invalidFiles = filePaths.filter((filePath) => {
            const ext = path.extname(filePath).toLowerCase();
            return !config.fileTypes.includes(ext);
        });
        return {
            valid: invalidFiles.length === 0,
            invalidFiles,
            supportedTypes: config.fileTypes,
        };
    }
}
exports.CommandRegistry = CommandRegistry;
CommandRegistry.commands = new Map([
    [
        types_1.Profiles.GENERATE_SONG_SCHEMA,
        {
            name: "SongSchema",
            description: "Generate Song schema from JSON metadata",
            fileTypes: [".json"],
            createCommand: () => new songCommand_1.SongCommand(),
        },
    ],
    [
        types_1.Profiles.GENERATE_LECTERN_DICTIONARY,
        {
            name: "LecternDictionary",
            description: "Generate Lectern dictionary from CSV files",
            fileTypes: [".csv"],
            createCommand: () => new lecternCommand_1.DictionaryCommand(),
        },
    ],
    [
        types_1.Profiles.GENERATE_ELASTICSEARCH_MAPPING,
        {
            name: "ElasticsearchMapping",
            description: "Generate Elasticsearch mapping from CSV, JSON, or Lectern dictionary",
            fileTypes: [".csv", ".json"], // Note: Lectern dictionaries are JSON files
            createCommand: () => new mappingCommands_1.MappingCommand(),
        },
    ],
    [
        types_1.Profiles.GENERATE_ARRANGER_CONFIGS,
        {
            name: "ArrangerConfigs",
            description: "Generate Arranger configs from Elasticsearch mapping",
            fileTypes: [".json"],
            createCommand: () => new arrangerCommand_1.ArrangerCommand(),
        },
    ],
    [
        types_1.Profiles.GENERATE_POSTGRES_TABLE,
        {
            name: "PostgresTable",
            description: "Generate PostgreSQL CREATE TABLE statement from CSV files",
            fileTypes: [".csv"],
            createCommand: () => new postgresCommand_1.PostgresCommand(),
        },
    ],
]);
//# sourceMappingURL=commandRegistry.js.map