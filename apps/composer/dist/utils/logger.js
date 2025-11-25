"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = exports.LogLevel = void 0;
// src/utils/logger.ts - Standardized logger with consistent template literal usage
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
    LogLevel[LogLevel["SECTION"] = 7] = "SECTION";
    LogLevel[LogLevel["INPUT"] = 8] = "INPUT";
})(LogLevel || (exports.LogLevel = LogLevel = {}));
// Centralized configuration for icons and colors
const LOG_CONFIG = {
    icons: {
        [LogLevel.DEBUG]: "🔍",
        [LogLevel.INFO]: "▸",
        [LogLevel.SUCCESS]: "✓",
        [LogLevel.WARN]: "⚠",
        [LogLevel.ERROR]: "✗",
        [LogLevel.TIP]: "    💡",
        [LogLevel.GENERIC]: "",
        [LogLevel.SECTION]: "",
        [LogLevel.INPUT]: "❔",
    },
    colors: {
        [LogLevel.DEBUG]: chalk_1.default.bold.gray,
        [LogLevel.INFO]: chalk_1.default.bold.cyan,
        [LogLevel.SUCCESS]: chalk_1.default.bold.green,
        [LogLevel.WARN]: chalk_1.default.bold.yellow,
        [LogLevel.ERROR]: chalk_1.default.bold.red,
        [LogLevel.TIP]: chalk_1.default.bold.yellow,
        [LogLevel.GENERIC]: chalk_1.default.white,
        [LogLevel.SECTION]: chalk_1.default.bold.blue,
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
        [LogLevel.SECTION]: "",
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
        if (level === LogLevel.SECTION) {
            return `${prefix}${colors[level](`${icons[level]} ${message}`)}`;
        }
        return `${prefix}${colors[level](`${icons[level]} ${labels[level]} `)}${message}`;
    }
    static setLevel(level) {
        this.config.level = level;
    }
    static enableDebug() {
        this.config.debug = true;
        this.config.level = LogLevel.DEBUG;
        console.log(chalk_1.default.gray("🔍 **Debug mode enabled**"));
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
     * Overloaded logging method for backwards compatibility with string arguments
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
    // Standardized template literal methods
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
    // String-based methods for backwards compatibility
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
    static section(text) {
        console.log(this.formatMessage(text, LogLevel.SECTION));
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
    // Enhanced default value methods with consistent template literal support
    static defaultValueInfo(message, overrideCommand) {
        if (this.config.level <= LogLevel.INFO) {
            console.log(this.formatMessage(message, LogLevel.INFO));
            console.log(chalk_1.default.gray `   Override with: ${overrideCommand}\n`);
        }
    }
    static defaultValueWarning(message, overrideCommand) {
        if (this.config.level <= LogLevel.WARN) {
            console.warn(this.formatMessage(message, LogLevel.WARN));
            console.log(chalk_1.default.gray `   Override with: ${overrideCommand}\n`);
        }
    }
    // Debug object logging with standardized formatting
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
    // Timing utility with template literal support
    static timing(label, timeMs) {
        const formattedTime = timeMs < 1000
            ? `${timeMs.toFixed(1)}ms`
            : `${(timeMs / 1000).toFixed(2)}s`;
        console.log(chalk_1.default.gray `⏱ ${label}: ${formattedTime}`);
    }
    // File list utilities
    static fileList(title, files) {
        if (files.length === 0)
            return;
        this.warnString(`${title}:\n`);
        files.forEach((file) => {
            console.log(chalk_1.default.gray `  - ${file}`);
        });
    }
    static errorFileList(title, files) {
        if (files.length === 0)
            return;
        this.errorString(`${title}:\n`);
        files.forEach((file) => {
            console.log(chalk_1.default.gray `  - ${file}`);
        });
    }
    static showReferenceCommands() {
        this.header("Composer Configuration Commands");
        this.generic(chalk_1.default.bold.magenta("Generate Song Schema:"));
        this.generic(chalk_1.default.white("composer -p SongSchema -f metadata.json"));
        this.generic(chalk_1.default.gray("Options:"));
        this.generic(chalk_1.default.gray("-p, --profile <profile> Execution profile (default: default)"));
        this.generic(chalk_1.default.gray("-f, --files <paths...>  Input JSON metadata file (required)"));
        this.generic(chalk_1.default.gray("-o, --output <path>     Output schema file path (default: configs/songSchema/)"));
        this.generic(chalk_1.default.gray("-n, --name <name>       Schema name"));
        this.generic(chalk_1.default.gray("--file-types <types...> Allowed file types"));
        this.generic("");
        this.generic(chalk_1.default.gray("Example: composer -p SongSchema -f file_metadata.json -n my_schema --file-types BAM VCF"));
        this.generic("");
        this.generic(chalk_1.default.bold.magenta("Generate Lectern Dictionary:"));
        this.generic(chalk_1.default.white("composer -p LecternDictionary -f data.csv"));
        this.generic(chalk_1.default.gray("Options:"));
        this.generic(chalk_1.default.gray("-p, --profile <profile> Execution profile (default: default)"));
        this.generic(chalk_1.default.gray("-f, --files <paths...>  Input CSV files (required)"));
        this.generic(chalk_1.default.gray("-o, --output <path>     Output dictionary file path (default: configs/lecternDictionaries/)"));
        this.generic(chalk_1.default.gray("-n, --name <name>       Dictionary name"));
        this.generic(chalk_1.default.gray("-d, --description <text> Dictionary description"));
        this.generic(chalk_1.default.gray("-v, --version <version> Dictionary version"));
        this.generic(chalk_1.default.gray("--delimiter <char>      CSV delimiter (default: ,)"));
        this.generic("");
        this.generic(chalk_1.default.gray('Example: composer -p LecternDictionary -f clinical_data.csv -n clinical_dict -d "Clinical data dictionary"'));
        this.generic("");
        this.generic(chalk_1.default.bold.magenta("Generate Arranger Configs:"));
        this.generic(chalk_1.default.white("composer -p ArrangerConfigs -f elasticsearch-mapping.json"));
        this.generic(chalk_1.default.gray("Options:"));
        this.generic(chalk_1.default.gray("-p, --profile <profile> Execution profile (default: default)"));
        this.generic(chalk_1.default.gray("-f, --files <paths...>  Input file mapping (JSON) (required)"));
        this.generic(chalk_1.default.gray("-o, --output <path>     Output file path for generated configs (default: configs/arrangerConfigs/)"));
        // this.generic(
        //   chalk.gray(
        //     "--arranger-doc-type <type> Arranger document type (file or analysis) (default: file)"
        //   )
        // );
        this.generic(chalk_1.default.gray("-i, --index <n>         Elasticsearch index name (default: data)"));
        this.generic("");
        this.generic(chalk_1.default.gray("Example: composer -p ArrangerConfigs -f mapping.json -o configs/clinicalConfigs/ -i clinical_data"));
        this.generic("");
        this.generic(chalk_1.default.bold.magenta("Generate Elasticsearch Mapping:"));
        this.generic(chalk_1.default.white("composer -p ElasticsearchMapping -f data.csv"));
        this.generic(chalk_1.default.gray("Options:"));
        this.generic(chalk_1.default.gray("-p, --profile <profile> Execution profile (default: default)"));
        this.generic(chalk_1.default.gray("-f, --files <paths...>  Input file paths (CSV, JSON, or Lectern dictionary, space separated) (required)"));
        this.generic(chalk_1.default.gray("-o, --output <path>     Output file path for generated mapping (default: configs/elasticsearchConfigs/)"));
        this.generic(chalk_1.default.gray("-i, --index <n>       Elasticsearch index name (default: data)"));
        // this.generic(
        //   chalk.gray(
        //     "--shards <number>        Number of Elasticsearch shards (default: 1)"
        //   )
        // );
        // this.generic(
        //   chalk.gray(
        //     "--replicas <number>      Number of Elasticsearch replicas (default: 1)"
        //   )
        // );
        this.generic(chalk_1.default.gray("--delimiter <char>       CSV delimiter (default: ,)"));
        // this.generic(
        //   chalk.gray(
        //     "--ignore-fields <fields...> Field names to exclude from mapping"
        //   )
        // );
        // this.generic(
        //   chalk.gray(
        //     "--skip-metadata          Skip adding submission metadata to mapping"
        //   )
        // );
        this.generic("");
        this.generic(chalk_1.default.bold.cyan("    From CSV files:"));
        this.generic(chalk_1.default.gray("    composer -p ElasticsearchMapping -f data.csv -i my_index -o /configs/es-mapping.json"));
        this.generic(chalk_1.default.bold.cyan("    From JSON (Including Lectern Dictionary):"));
        this.generic(chalk_1.default.gray("    composer -p ElasticsearchMapping -f clinical-dictionary.json -i clinical_data -o mapping.json"));
        this.generic("");
        this.generic(chalk_1.default.bold.magenta("Generate PostgreSQL Table:"));
        this.generic(chalk_1.default.white("composer -p PostgresTable -f data.csv"));
        this.generic(chalk_1.default.gray("Options:"));
        this.generic(chalk_1.default.gray("-p, --profile <profile> Execution profile (default: default)"));
        this.generic(chalk_1.default.gray("-f, --files <paths...>  Input CSV file path (required)"));
        this.generic(chalk_1.default.gray("-o, --output <path>     Output SQL file path (default: configs/postgresConfigs/)"));
        this.generic(chalk_1.default.gray("--table-name <n>        PostgreSQL table name"));
        this.generic(chalk_1.default.gray("--schema <n>            PostgreSQL schema name"));
        this.generic(chalk_1.default.gray("--delimiter <char>      CSV delimiter (default: ,)"));
        this.generic("");
        this.generic(chalk_1.default.bold.cyan("    Basic table generation:"));
        this.generic(chalk_1.default.gray("    composer -p PostgresTable -f users.csv --table-name users -o create_users.sql"));
        this.generic(chalk_1.default.bold.cyan("    With schema:"));
        this.generic(chalk_1.default.gray("    composer -p PostgresTable -f patient_data.csv --table-name patients --schema clinical"));
        this.generic("");
    }
}
exports.Logger = Logger;
Logger.config = {
    level: LogLevel.INFO,
    debug: false,
};
//# sourceMappingURL=logger.js.map