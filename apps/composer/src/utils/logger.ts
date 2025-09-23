// src/utils/logger.ts - Standardized logger with consistent template literal usage
import chalk from "chalk";

// Make LogLevel public for use in other modules
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  SUCCESS = 2,
  WARN = 3,
  ERROR = 4,
  TIP = 5,
  GENERIC = 6,
  SECTION = 7,
  INPUT = 8,
}

interface LoggerConfig {
  level: LogLevel;
  debug: boolean;
}

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
  } as const,

  colors: {
    [LogLevel.DEBUG]: chalk.bold.gray,
    [LogLevel.INFO]: chalk.bold.cyan,
    [LogLevel.SUCCESS]: chalk.bold.green,
    [LogLevel.WARN]: chalk.bold.yellow,
    [LogLevel.ERROR]: chalk.bold.red,
    [LogLevel.TIP]: chalk.bold.yellow,
    [LogLevel.GENERIC]: chalk.white,
    [LogLevel.SECTION]: chalk.bold.blue,
    [LogLevel.INPUT]: chalk.bold.yellow,
  } as const,

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
  } as const,

  needsNewLine: new Set([
    LogLevel.ERROR,
    LogLevel.INPUT,
    LogLevel.WARN,
    LogLevel.SUCCESS,
  ]),
} as const;

export class Logger {
  private static config: LoggerConfig = {
    level: LogLevel.INFO,
    debug: false,
  };

  private static formatMessage(message: string, level: LogLevel): string {
    const { icons, colors, labels, needsNewLine } = LOG_CONFIG;

    const prefix = needsNewLine.has(level) ? "\n" : "";

    if (level === LogLevel.GENERIC) {
      return colors[level](message);
    }

    if (level === LogLevel.SECTION) {
      return `${prefix}${colors[level](`${icons[level]} ${message}`)}`;
    }

    return `${prefix}${colors[level](
      `${icons[level]} ${labels[level]} `
    )}${message}`;
  }

  static setLevel(level: LogLevel): void {
    this.config.level = level;
  }

  static enableDebug(): void {
    this.config.debug = true;
    this.config.level = LogLevel.DEBUG;
    console.log(chalk.gray("🔍 **Debug mode enabled**"));
  }

  /**
   * Formats template literal strings with highlighted variables
   * Standardized approach for all logging methods
   */
  static formatVariables(
    strings: TemplateStringsArray,
    ...values: any[]
  ): string {
    return strings.reduce((result, string, i) => {
      const value =
        i < values.length ? chalk.bold.whiteBright(String(values[i])) : "";
      return result + string + value;
    }, "");
  }

  /**
   * Internal logging method with standardized template literal support
   */
  private static log(
    level: LogLevel,
    strings: TemplateStringsArray,
    ...values: any[]
  ): void {
    if (this.config.level > level && level !== LogLevel.DEBUG) return;
    if (!this.config.debug && level === LogLevel.DEBUG) return;

    const message = this.formatVariables(strings, ...values);
    const formattedMessage = this.formatMessage(message, level);

    if (level === LogLevel.WARN) {
      console.warn(formattedMessage);
    } else if (level === LogLevel.ERROR) {
      console.error(formattedMessage);
    } else {
      console.log(formattedMessage);
    }
  }

  /**
   * Overloaded logging method for backwards compatibility with string arguments
   */
  private static logString(level: LogLevel, message: string): void {
    if (this.config.level > level && level !== LogLevel.DEBUG) return;
    if (!this.config.debug && level === LogLevel.DEBUG) return;

    const formattedMessage = this.formatMessage(message, level);

    if (level === LogLevel.WARN) {
      console.warn(formattedMessage);
    } else if (level === LogLevel.ERROR) {
      console.error(formattedMessage);
    } else {
      console.log(formattedMessage);
    }
  }

  // Standardized template literal methods
  static debug(strings: TemplateStringsArray, ...values: any[]): void {
    this.log(LogLevel.DEBUG, strings, ...values);
  }

  static info(strings: TemplateStringsArray, ...values: any[]): void {
    this.log(LogLevel.INFO, strings, ...values);
  }

  static success(strings: TemplateStringsArray, ...values: any[]): void {
    this.log(LogLevel.SUCCESS, strings, ...values);
  }

  static warn(strings: TemplateStringsArray, ...values: any[]): void {
    this.log(LogLevel.WARN, strings, ...values);
  }

  static error(strings: TemplateStringsArray, ...values: any[]): void {
    this.log(LogLevel.ERROR, strings, ...values);
  }

  static tip(strings: TemplateStringsArray, ...values: any[]): void {
    this.log(LogLevel.TIP, strings, ...values);
  }

  // String-based methods for backwards compatibility
  static debugString(message: string): void {
    this.logString(LogLevel.DEBUG, message);
  }

  static infoString(message: string): void {
    this.logString(LogLevel.INFO, message);
  }

  static successString(message: string): void {
    this.logString(LogLevel.SUCCESS, message);
  }

  static warnString(message: string): void {
    this.logString(LogLevel.WARN, message);
  }

  static errorString(message: string): void {
    this.logString(LogLevel.ERROR, message);
  }

  static tipString(message: string): void {
    this.logString(LogLevel.TIP, message);
  }

  // Special purpose methods
  static generic(message: string): void {
    console.log(this.formatMessage(message, LogLevel.GENERIC));
  }

  static input(message: string): string {
    return this.formatMessage(message, LogLevel.INPUT);
  }

  static section(text: string): void {
    console.log(this.formatMessage(text, LogLevel.SECTION));
  }

  static header(text: string): void {
    const separator = "═".repeat(text.length + 6);
    console.log(`\n${chalk.bold.magenta(separator)}`);
    console.log(`${chalk.bold.magenta("  " + text + "  ")}`);
    console.log(`${chalk.bold.magenta(separator)}\n`);
  }

  static commandInfo(command: string, description: string): void {
    console.log`${chalk.bold.blue(command)}: ${description}`;
  }

  // Enhanced default value methods with consistent template literal support
  static defaultValueInfo(message: string, overrideCommand: string): void {
    if (this.config.level <= LogLevel.INFO) {
      console.log(this.formatMessage(message, LogLevel.INFO));
      console.log(chalk.gray`   Override with: ${overrideCommand}\n`);
    }
  }

  static defaultValueWarning(message: string, overrideCommand: string): void {
    if (this.config.level <= LogLevel.WARN) {
      console.warn(this.formatMessage(message, LogLevel.WARN));
      console.log(chalk.gray`   Override with: ${overrideCommand}\n`);
    }
  }

  // Debug object logging with standardized formatting
  static debugObject(label: string, obj: any): void {
    if (this.config.debug) {
      console.log(chalk.gray`🔍 ${label}:`);
      Object.entries(obj).forEach(([key, value]) => {
        console.log(chalk.gray`  ${key}:`, value || "Not set");
      });
    }
  }

  static initialize(): void {
    if (process.env.DEBUG === "true") {
      this.enableDebug();
    }
  }

  // Timing utility with template literal support
  static timing(label: string, timeMs: number): void {
    const formattedTime =
      timeMs < 1000
        ? `${timeMs.toFixed(1)}ms`
        : `${(timeMs / 1000).toFixed(2)}s`;

    console.log(chalk.gray`⏱ ${label}: ${formattedTime}`);
  }

  // File list utilities
  static fileList(title: string, files: string[]): void {
    if (files.length === 0) return;
    this.warnString(`${title}:\n`);
    files.forEach((file) => {
      console.log(chalk.gray`  - ${file}`);
    });
  }

  static errorFileList(title: string, files: string[]): void {
    if (files.length === 0) return;
    this.errorString(`${title}:\n`);
    files.forEach((file) => {
      console.log(chalk.gray`  - ${file}`);
    });
  }

  static showReferenceCommands(): void {
    this.header("Composer Configuration Commands");

    this.generic(chalk.bold.magenta("Generate Song Schema:"));
    this.generic(chalk.white("composer -p SongSchema -f metadata.json"));
    this.generic(chalk.gray("Options:"));
    this.generic(
      chalk.gray("-p, --profile <profile> Execution profile (default: default)")
    );
    this.generic(
      chalk.gray("-f, --files <paths...>  Input JSON metadata file (required)")
    );
    this.generic(
      chalk.gray(
        "-o, --output <path>     Output schema file path (default: configs/songSchema/)"
      )
    );
    this.generic(chalk.gray("-n, --name <name>       Schema name"));
    this.generic(chalk.gray("--file-types <types...> Allowed file types"));
    this.generic("");
    this.generic(
      chalk.gray(
        "Example: composer -p SongSchema -f file_metadata.json -n my_schema --file-types BAM VCF"
      )
    );
    this.generic("");

    this.generic(chalk.bold.magenta("Generate Lectern Dictionary:"));
    this.generic(chalk.white("composer -p LecternDictionary -f data.csv"));
    this.generic(chalk.gray("Options:"));
    this.generic(
      chalk.gray("-p, --profile <profile> Execution profile (default: default)")
    );
    this.generic(
      chalk.gray("-f, --files <paths...>  Input CSV files (required)")
    );
    this.generic(
      chalk.gray(
        "-o, --output <path>     Output dictionary file path (default: configs/lecternDictionaries/)"
      )
    );
    this.generic(chalk.gray("-n, --name <name>       Dictionary name"));
    this.generic(chalk.gray("-d, --description <text> Dictionary description"));
    this.generic(chalk.gray("-v, --version <version> Dictionary version"));
    this.generic(
      chalk.gray("--delimiter <char>      CSV delimiter (default: ,)")
    );
    this.generic("");
    this.generic(
      chalk.gray(
        'Example: composer -p LecternDictionary -f clinical_data.csv -n clinical_dict -d "Clinical data dictionary"'
      )
    );
    this.generic("");

    this.generic(chalk.bold.magenta("Generate Arranger Configs:"));
    this.generic(
      chalk.white("composer -p ArrangerConfigs -f elasticsearch-mapping.json")
    );
    this.generic(chalk.gray("Options:"));
    this.generic(
      chalk.gray("-p, --profile <profile> Execution profile (default: default)")
    );
    this.generic(
      chalk.gray("-f, --files <paths...>  Input file mapping (JSON) (required)")
    );
    this.generic(
      chalk.gray(
        "-o, --output <path>     Output file path for generated configs (default: configs/arrangerConfigs/)"
      )
    );
    // this.generic(
    //   chalk.gray(
    //     "--arranger-doc-type <type> Arranger document type (file or analysis) (default: file)"
    //   )
    // );
    this.generic(
      chalk.gray(
        "-i, --index <n>         Elasticsearch index name (default: data)"
      )
    );
    this.generic("");
    this.generic(
      chalk.gray(
        "Example: composer -p ArrangerConfigs -f mapping.json -o configs/clinicalConfigs/ -i clinical_data"
      )
    );
    this.generic("");

    this.generic(chalk.bold.magenta("Generate Elasticsearch Mapping:"));
    this.generic(chalk.white("composer -p ElasticsearchMapping -f data.csv"));
    this.generic(chalk.gray("Options:"));
    this.generic(
      chalk.gray("-p, --profile <profile> Execution profile (default: default)")
    );
    this.generic(
      chalk.gray(
        "-f, --files <paths...>  Input file paths (CSV, JSON, or Lectern dictionary, space separated) (required)"
      )
    );
    this.generic(
      chalk.gray(
        "-o, --output <path>     Output file path for generated mapping (default: configs/elasticsearchConfigs/)"
      )
    );
    this.generic(
      chalk.gray(
        "-i, --index <n>       Elasticsearch index name (default: data)"
      )
    );
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
    this.generic(
      chalk.gray("--delimiter <char>       CSV delimiter (default: ,)")
    );
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
    this.generic(chalk.bold.cyan("    From CSV files:"));
    this.generic(
      chalk.gray(
        "    composer -p ElasticsearchMapping -f data.csv -i my_index -o /configs/es-mapping.json"
      )
    );
    this.generic(
      chalk.bold.cyan("    From JSON (Including Lectern Dictionary):")
    );
    this.generic(
      chalk.gray(
        "    composer -p ElasticsearchMapping -f clinical-dictionary.json -i clinical_data -o mapping.json"
      )
    );
    this.generic("");

    this.generic(chalk.bold.magenta("Generate PostgreSQL Table:"));
    this.generic(chalk.white("composer -p PostgresTable -f data.csv"));
    this.generic(chalk.gray("Options:"));
    this.generic(
      chalk.gray("-p, --profile <profile> Execution profile (default: default)")
    );
    this.generic(
      chalk.gray("-f, --files <paths...>  Input CSV file path (required)")
    );
    this.generic(
      chalk.gray(
        "-o, --output <path>     Output SQL file path (default: configs/postgresConfigs/)"
      )
    );
    this.generic(chalk.gray("--table-name <n>        PostgreSQL table name"));
    this.generic(chalk.gray("--schema <n>            PostgreSQL schema name"));
    this.generic(
      chalk.gray("--delimiter <char>      CSV delimiter (default: ,)")
    );
    this.generic("");
    this.generic(chalk.bold.cyan("    Basic table generation:"));
    this.generic(
      chalk.gray(
        "    composer -p PostgresTable -f users.csv --table-name users -o create_users.sql"
      )
    );
    this.generic(chalk.bold.cyan("    With schema:"));
    this.generic(
      chalk.gray(
        "    composer -p PostgresTable -f patient_data.csv --table-name patients --schema clinical"
      )
    );
    this.generic("");
  }
}
