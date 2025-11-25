"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = exports.LogLevel = void 0;
// src/utils/logger.ts - Enhanced logger with standardized template literal usage
const chalk_1 = __importDefault(require("chalk"));
// Make LogLevel public for use in other modules
var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["DEBUG"] = 0] = "DEBUG";
    LogLevel[LogLevel["INFO"] = 1] = "INFO";
    LogLevel[LogLevel["SUCCESS"] = 2] = "SUCCESS";
    LogLevel[LogLevel["WARN"] = 3] = "WARN";
    LogLevel[LogLevel["ERROR"] = 4] = "ERROR";
    LogLevel[LogLevel["TIP"] = 5] = "TIP";
    LogLevel[LogLevel["GENERIC"] = 6] = "GENERIC";
    LogLevel[LogLevel["SUGGESTION"] = 7] = "SUGGESTION";
    LogLevel[LogLevel["INPUT"] = 8] = "INPUT";
})(LogLevel = exports.LogLevel || (exports.LogLevel = {}));
// Centralized configuration for icons and colors
const LOG_CONFIG = {
    icons: {
        [LogLevel.DEBUG]: "🔍",
        [LogLevel.INFO]: "❯",
        [LogLevel.SUCCESS]: "✔",
        [LogLevel.WARN]: "⚠",
        [LogLevel.ERROR]: "✖",
        [LogLevel.TIP]: "▸",
        [LogLevel.GENERIC]: "▸",
        [LogLevel.SUGGESTION]: "🔍",
        [LogLevel.INPUT]: "❔",
    },
    colors: {
        [LogLevel.DEBUG]: chalk_1.default.bold.green,
        [LogLevel.INFO]: chalk_1.default.bold.cyan,
        [LogLevel.SUCCESS]: chalk_1.default.bold.green,
        [LogLevel.WARN]: chalk_1.default.bold.yellow,
        [LogLevel.ERROR]: chalk_1.default.bold.red,
        [LogLevel.TIP]: chalk_1.default.bold.white,
        [LogLevel.GENERIC]: chalk_1.default.white,
        [LogLevel.SUGGESTION]: chalk_1.default.bold.cyan,
        [LogLevel.INPUT]: chalk_1.default.bold.yellow,
    },
    labels: {
        [LogLevel.DEBUG]: "Debug",
        [LogLevel.INFO]: "Info",
        [LogLevel.SUCCESS]: "Success",
        [LogLevel.WARN]: "Warn",
        [LogLevel.ERROR]: "Error",
        [LogLevel.TIP]: "",
        [LogLevel.GENERIC]: "",
        [LogLevel.SUGGESTION]: "",
        [LogLevel.INPUT]: "User Input",
    },
    needsNewLine: new Set([
        LogLevel.ERROR,
        LogLevel.INPUT,
        LogLevel.WARN,
        LogLevel.SUCCESS,
    ]),
};
class Logger {
    static formatMessage(message, level) {
        const { icons, colors, labels, needsNewLine } = LOG_CONFIG;
        const prefix = needsNewLine.has(level) ? "\n" : "";
        if (level === LogLevel.GENERIC) {
            return colors[level](message);
        }
        if (level === LogLevel.SUGGESTION) {
            return `${prefix}\n${colors[level](`${icons[level]} ${message}`)}`;
        }
        if (level === LogLevel.TIP) {
            return `${prefix}${colors[level](` ${icons[level]} ${labels[level]} `)}${message}`;
        }
        return `${prefix}${colors[level](`${icons[level]} ${labels[level]} `)}${message}`;
    }
    static setLevel(level) {
        this.config.level = level;
    }
    static enableDebug() {
        this.config.debug = true;
        this.config.level = LogLevel.DEBUG;
        console.log(chalk_1.default.bold.green("\n🔍 Debug mode enabled\n"));
    }
    /**
     * Formats template literal strings with highlighted variables
     * Standardized approach for all logging methods
     */
    static formatVariables(strings, ...values) {
        return strings.reduce((result, string, i) => {
            const value = i < values.length ? chalk_1.default.bold.whiteBright(String(values[i])) : "";
            return result + string + value;
        }, "");
    }
    /**
     * Internal logging method with standardized template literal support
     */
    static log(level, strings, ...values) {
        if (this.config.level > level && level !== LogLevel.DEBUG)
            return;
        if (!this.config.debug && level === LogLevel.DEBUG)
            return;
        const message = this.formatVariables(strings, ...values);
        const formattedMessage = this.formatMessage(message, level);
        if (level === LogLevel.WARN) {
            console.warn(formattedMessage);
        }
        else if (level === LogLevel.ERROR) {
            console.error(formattedMessage);
        }
        else {
            console.log(formattedMessage);
        }
    }
    /**
     * Internal logging method for string arguments (backward compatibility)
     */
    static logString(level, message) {
        if (this.config.level > level && level !== LogLevel.DEBUG)
            return;
        if (!this.config.debug && level === LogLevel.DEBUG)
            return;
        const formattedMessage = this.formatMessage(message, level);
        if (level === LogLevel.WARN) {
            console.warn(formattedMessage);
        }
        else if (level === LogLevel.ERROR) {
            console.error(formattedMessage);
        }
        else {
            console.log(formattedMessage);
        }
    }
    // Template literal methods (preferred)
    static debug(strings, ...values) {
        this.log(LogLevel.DEBUG, strings, ...values);
    }
    static info(strings, ...values) {
        this.log(LogLevel.INFO, strings, ...values);
    }
    static success(strings, ...values) {
        this.log(LogLevel.SUCCESS, strings, ...values);
    }
    static warn(strings, ...values) {
        this.log(LogLevel.WARN, strings, ...values);
    }
    static error(strings, ...values) {
        this.log(LogLevel.ERROR, strings, ...values);
    }
    static tip(strings, ...values) {
        this.log(LogLevel.TIP, strings, ...values);
    }
    // String-based methods (for error factory and backward compatibility)
    static debugString(message) {
        this.logString(LogLevel.DEBUG, message);
    }
    static infoString(message) {
        this.logString(LogLevel.INFO, message);
    }
    static successString(message) {
        this.logString(LogLevel.SUCCESS, message);
    }
    static warnString(message) {
        this.logString(LogLevel.WARN, message);
    }
    static errorString(message) {
        this.logString(LogLevel.ERROR, message);
    }
    static tipString(message) {
        this.logString(LogLevel.TIP, message);
    }
    // Special purpose methods
    static generic(message) {
        console.log(this.formatMessage(message, LogLevel.GENERIC));
    }
    static input(message) {
        return this.formatMessage(message, LogLevel.INPUT);
    }
    static suggestion(text) {
        console.log(this.formatMessage(text, LogLevel.SUGGESTION));
    }
    static header(text) {
        const separator = "═".repeat(text.length + 6);
        console.log(`\n${chalk_1.default.bold.magenta(separator)}`);
        console.log(`${chalk_1.default.bold.magenta("  " + text + "  ")}`);
        console.log(`${chalk_1.default.bold.magenta(separator)}\n`);
    }
    static commandInfo(command, description) {
        console.log `${chalk_1.default.bold.blue(command)}: ${description}`;
    }
    // Enhanced default value methods
    static defaultValueInfo(message, overrideCommand) {
        if (this.config.level <= LogLevel.INFO) {
            console.log(this.formatMessage(message, LogLevel.INFO));
            console.log(chalk_1.default.gray `   Override with: ${overrideCommand}\n`);
        }
    }
    static commandValueTip(message, overrideCommand) {
        if (this.config.level <= LogLevel.TIP) {
            console.log(this.formatMessage(message, LogLevel.TIP));
            console.log(chalk_1.default.gray `   Override with: ${overrideCommand}\n`);
        }
    }
    // Debug object logging
    static debugObject(label, obj) {
        if (this.config.debug) {
            console.log(chalk_1.default.gray `🔍 ${label}:`);
            Object.entries(obj).forEach(([key, value]) => {
                console.log(chalk_1.default.gray `  ${key}:`, value || "Not set");
            });
        }
    }
    static initialize() {
        if (process.env.DEBUG === "true") {
            this.enableDebug();
        }
    }
    // Timing utility
    static timing(label, timeMs) {
        const formattedTime = timeMs < 1000
            ? `${timeMs.toFixed(1)}ms`
            : `${(timeMs / 1000).toFixed(2)}s`;
        console.log(chalk_1.default.gray `⏱ ${label}: ${formattedTime}`);
    }
    // File list utilities (updated names for consistency)
    static warnfileList(title, files) {
        if (files.length === 0)
            return;
        Logger.warn `${title}:`;
        files.forEach((file) => {
            console.log(chalk_1.default.gray `  - ${file}`);
        });
    }
    static infofileList(title, files) {
        if (files.length === 0)
            return;
        Logger.info `${title}:`;
        files.forEach((file) => {
            console.log(chalk_1.default.gray `  - ${file}`);
        });
    }
    static errorFileList(title, files) {
        if (files.length === 0)
            return;
        Logger.errorString(`${title}:`);
        files.forEach((file) => {
            console.log(chalk_1.default.gray `  - ${file}`);
        });
    }
    static showReferenceCommands() {
        this.header("Conductor Commands");
        // Full Pipeline Command
        this.generic(chalk_1.default.bold.magenta("Complete Workflow (CSV → PostgreSQL → Elasticsearch):"));
        this.generic(chalk_1.default.white("conductor upload -f data.csv -t table-name -i index-name"));
        this.generic(chalk_1.default.gray("Options:"));
        this.generic(chalk_1.default.gray("-f, --file <paths...>   CSV files to process (required)"));
        this.generic(chalk_1.default.gray("-t, --table <name>      Database table name (default: data)"));
        this.generic(chalk_1.default.gray("-i, --index <name>      Elasticsearch index name (default: data)"));
        this.generic(chalk_1.default.gray("--db-host <host:port>   PostgreSQL connection (default: localhost:5435)"));
        this.generic(chalk_1.default.gray("--es-host <host:port>   Elasticsearch connection (default: localhost:9200)"));
        this.generic(chalk_1.default.gray("-b, --batch-size <n>    Batch size (default: 1000)"));
        this.generic("");
        this.generic(chalk_1.default.gray("Example: conductor upload -f users.csv -t users -i users-index"));
        this.generic("");
        // Elasticsearch Only Upload
        this.generic(chalk_1.default.bold.magenta("Elasticsearch Only Upload:"));
        this.generic(chalk_1.default.white("conductor esupload -f data.csv -i index-name"));
        this.generic(chalk_1.default.gray("Options:"));
        this.generic(chalk_1.default.gray("-f, --file <paths...>   CSV files to upload (required)"));
        this.generic(chalk_1.default.gray("-i, --index <name>      Elasticsearch index name (default: data)"));
        this.generic(chalk_1.default.gray("--es-host <host:port>   Elasticsearch connection (default: localhost:9200)"));
        this.generic(chalk_1.default.gray("--es-user <username>    Elasticsearch username (default: elastic)"));
        this.generic(chalk_1.default.gray("--es-pass <password>    Elasticsearch password (default: myelasticpassword)"));
        this.generic(chalk_1.default.gray("-b, --batch-size <n>    Batch size (default: 1000)"));
        this.generic("");
        this.generic(chalk_1.default.gray("Example: conductor esupload -f data.csv -i my-index"));
        this.generic("");
        // PostgreSQL Only Upload
        this.generic(chalk_1.default.bold.magenta("PostgreSQL Only Upload:"));
        this.generic(chalk_1.default.white("conductor dbupload -f data.csv -t table-name"));
        this.generic(chalk_1.default.gray("Options:"));
        this.generic(chalk_1.default.gray("-f, --file <paths...>   CSV files to upload (required)"));
        this.generic(chalk_1.default.gray("-t, --table <name>      Database table name (default: data)"));
        this.generic(chalk_1.default.gray("--db-host <host:port>   PostgreSQL connection (default: localhost:5435)"));
        this.generic(chalk_1.default.gray("--db-name <name>        Database name (default: overtureDb)"));
        this.generic(chalk_1.default.gray("--db-user <username>    Database username (default: admin)"));
        this.generic(chalk_1.default.gray("--db-pass <password>    Database password (default: admin123)"));
        this.generic(chalk_1.default.gray("-b, --batch-size <n>    Batch size (default: 1000)"));
        this.generic("");
        this.generic(chalk_1.default.gray("Example: conductor dbupload -f users.csv -t users"));
        this.generic("");
        // Table Indexing
        this.generic(chalk_1.default.bold.magenta("Index Existing PostgreSQL Table:"));
        this.generic(chalk_1.default.white("conductor indexDb -t table-name -i index-name"));
        this.generic(chalk_1.default.gray("Options:"));
        this.generic(chalk_1.default.gray("-t, --table <name>      Database table name (default: data)"));
        this.generic(chalk_1.default.gray("-i, --index <name>      Elasticsearch index name (default: data)"));
        this.generic(chalk_1.default.gray("--db-host <host:port>   PostgreSQL connection (default: localhost:5435)"));
        this.generic(chalk_1.default.gray("--es-host <host:port>   Elasticsearch connection (default: localhost:9200)"));
        this.generic(chalk_1.default.gray("-b, --batch-size <n>    Batch size (default: 1000)"));
        this.generic("");
        this.generic(chalk_1.default.gray("Example: conductor indexDb -t users -i users-index"));
        this.generic("");
        // Connection Information
        this.generic(chalk_1.default.bold.magenta("Default Connection Information:"));
        this.generic(chalk_1.default.gray("PostgreSQL:    localhost:5435 (admin/admin123) → overtureDb database"));
        this.generic(chalk_1.default.gray("Elasticsearch: localhost:9200 (elastic/myelasticpassword)"));
        this.generic("");
    }
}
exports.Logger = Logger;
Logger.config = {
    level: LogLevel.INFO,
    debug: false,
};
