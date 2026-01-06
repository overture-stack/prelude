"use strict";
// src/commands/CommandRegistry.ts
/**
 * Simplified command registry to replace the complex factory pattern
 * Updated to use error factory pattern for consistent error handling
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommandRegistry = void 0;
const logger_1 = require("../utils/logger");
const errors_1 = require("../utils/errors");
// Import all command classes
const uploadCsvCommand_1 = require("./uploadCsvCommand");
const lecternUploadCommand_1 = require("./lecternUploadCommand");
const lyricRegistrationCommand_1 = require("./lyricRegistrationCommand");
const lyricUploadCommand_1 = require("./lyricUploadCommand");
const songUploadSchemaCommand_1 = require("./songUploadSchemaCommand");
const songCreateStudyCommand_1 = require("./songCreateStudyCommand");
const songSubmitAnalysisCommand_1 = require("./songSubmitAnalysisCommand");
const songPublishAnalysisCommand_1 = require("./songPublishAnalysisCommand");
const maestroIndexCommand_1 = require("./maestroIndexCommand");
const postgresUploadCommand_1 = require("./postgresUploadCommand");
const postgresIndexCommand_1 = require("./postgresIndexCommand");
const postgresFullPipelineCommand_1 = require("./postgresFullPipelineCommand");
/**
 * Registry of all available commands with metadata
 */
class CommandRegistry {
    /**
     * Create a command instance by name
     */
    static createCommand(commandName) {
        const commandInfo = this.commands.get(commandName);
        if (!commandInfo) {
            const availableCommands = Array.from(this.commands.keys()).join(", ");
            throw errors_1.ErrorFactory.args(`Unknown command: ${commandName}`, [
                `Available commands: ${availableCommands}`,
                "Use 'conductor --help' to see all available commands",
                "Check the command spelling and try again",
            ]);
        }
        logger_1.Logger.debug `Creating command: ${commandInfo.name}`;
        try {
            return new commandInfo.constructor();
        }
        catch (error) {
            throw errors_1.ErrorFactory.args(`Failed to create command: ${commandName}`, [
                "This appears to be an internal error",
                "Try running with --debug for more information",
                "Contact support if the issue persists",
            ]);
        }
    }
    /**
     * Check if a command exists
     */
    static hasCommand(commandName) {
        return this.commands.has(commandName);
    }
    /**
     * Get all available command names
     */
    static getCommandNames() {
        return Array.from(this.commands.keys());
    }
    /**
     * Get command information
     */
    static getCommandInfo(commandName) {
        return this.commands.get(commandName);
    }
    /**
     * Get all commands grouped by category
     */
    static getCommandsByCategory() {
        const categories = new Map();
        for (const commandInfo of this.commands.values()) {
            const existing = categories.get(commandInfo.category) || [];
            existing.push(commandInfo);
            categories.set(commandInfo.category, existing);
        }
        return categories;
    }
    /**
     * Display help information for all commands
     */
    static displayHelp() {
        logger_1.Logger.header("Available Commands");
        const categories = this.getCommandsByCategory();
        for (const [category, commands] of categories) {
            logger_1.Logger.suggestion(category);
            for (const command of commands) {
                logger_1.Logger.commandInfo(command.name, command.description);
            }
            logger_1.Logger.generic("");
        }
    }
    /**
     * Display help for a specific command
     */
    static displayCommandHelp(commandName) {
        const commandInfo = this.getCommandInfo(commandName);
        if (!commandInfo) {
            logger_1.Logger.errorString(`Unknown command: ${commandName}`);
            this.displayHelp();
            return;
        }
        logger_1.Logger.header(`Command: ${commandInfo.name}`);
        logger_1.Logger.infoString(commandInfo.description);
        logger_1.Logger.infoString(`Category: ${commandInfo.category}`);
        // You could extend this to show command-specific options
        logger_1.Logger.tipString(`Use 'conductor ${commandName} --help' for command-specific options`);
    }
    /**
     * Register a new command (useful for plugins or extensions)
     */
    static registerCommand(name, description, category, constructor) {
        if (this.commands.has(name)) {
            logger_1.Logger.warnString(`Command '${name}' is already registered. Overwriting.`);
        }
        this.commands.set(name, {
            name,
            description,
            category,
            constructor,
        });
        logger_1.Logger.debug `Registered command: ${name}`;
    }
    /**
     * Unregister a command
     */
    static unregisterCommand(name) {
        return this.commands.delete(name);
    }
    /**
     * Validate that all registered commands are properly configured
     */
    static validateRegistry() {
        const issues = [];
        for (const [name, info] of this.commands) {
            if (!info.name || info.name !== name) {
                issues.push(`Command '${name}' has mismatched name property`);
            }
            if (!info.description) {
                issues.push(`Command '${name}' is missing description`);
            }
            if (!info.category) {
                issues.push(`Command '${name}' is missing category`);
            }
            if (!info.constructor) {
                issues.push(`Command '${name}' is missing constructor`);
            }
        }
        if (issues.length > 0) {
            throw errors_1.ErrorFactory.validation("Command registry validation failed", { issues }, [
                "Check command definitions in CommandRegistry",
                "Ensure all commands have required properties",
                "Fix the validation issues and try again",
            ]);
        }
        logger_1.Logger.debug `Command registry validation passed (${this.commands.size} commands)`;
    }
    /**
     * Get registry statistics
     */
    static getStats() {
        const categories = this.getCommandsByCategory();
        const categoryCounts = {};
        for (const [category, commands] of categories) {
            categoryCounts[category] = commands.length;
        }
        return {
            totalCommands: this.commands.size,
            categoryCounts,
            categories: Array.from(categories.keys()),
        };
    }
}
exports.CommandRegistry = CommandRegistry;
CommandRegistry.commands = new Map([
    [
        "upload",
        {
            name: "upload",
            description: "Complete workflow: CSV → PostgreSQL → Elasticsearch",
            category: "Data Pipeline",
            constructor: postgresFullPipelineCommand_1.PostgresFullPipelineCommand,
        },
    ],
    [
        "lecternUpload",
        {
            name: "lecternUpload",
            description: "Upload schema to Lectern server",
            category: "Schema Management",
            constructor: lecternUploadCommand_1.LecternUploadCommand,
        },
    ],
    [
        "lyricRegister",
        {
            name: "lyricRegister",
            description: "Register a dictionary with Lyric service",
            category: "Data Management",
            constructor: lyricRegistrationCommand_1.LyricRegistrationCommand,
        },
    ],
    [
        "lyricUpload",
        {
            name: "lyricUpload",
            description: "Upload data to Lyric service",
            category: "Data Upload",
            constructor: lyricUploadCommand_1.LyricUploadCommand,
        },
    ],
    [
        "songUploadSchema",
        {
            name: "songUploadSchema",
            description: "Upload schema to SONG server",
            category: "Schema Management",
            constructor: songUploadSchemaCommand_1.SongUploadSchemaCommand,
        },
    ],
    [
        "songCreateStudy",
        {
            name: "songCreateStudy",
            description: "Create study in SONG server",
            category: "Study Management",
            constructor: songCreateStudyCommand_1.SongCreateStudyCommand,
        },
    ],
    [
        "songSubmitAnalysis",
        {
            name: "songSubmitAnalysis",
            description: "Submit analysis to SONG and upload files to Score",
            category: "Analysis Management",
            constructor: songSubmitAnalysisCommand_1.SongSubmitAnalysisCommand,
        },
    ],
    [
        "songPublishAnalysis",
        {
            name: "songPublishAnalysis",
            description: "Publish analysis in SONG server",
            category: "Analysis Management",
            constructor: songPublishAnalysisCommand_1.SongPublishAnalysisCommand,
        },
    ],
    [
        "maestroIndex",
        {
            name: "maestroIndex",
            description: "Index data using Maestro",
            category: "Data Indexing",
            constructor: maestroIndexCommand_1.MaestroIndexCommand,
        },
    ],
    [
        "esupload",
        {
            name: "esupload",
            description: "Upload CSV data directly to Elasticsearch",
            category: "Data Upload",
            constructor: uploadCsvCommand_1.UploadCommand,
        },
    ],
    [
        "dbupload",
        {
            name: "dbupload",
            description: "Upload CSV data to PostgreSQL database",
            category: "Data Upload",
            constructor: postgresUploadCommand_1.PostgresUploadCommand,
        },
    ],
    [
        "indexDb",
        {
            name: "indexDb",
            description: "Index PostgreSQL table data to Elasticsearch",
            category: "Data Indexing",
            constructor: postgresIndexCommand_1.PostgresIndexCommand,
        },
    ],
]);
