// src/utils/logger.ts - Enhanced logger with PostgreSQL upload commands
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
  SUGGESTION = 7,
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
    [LogLevel.INFO]: "❯",
    [LogLevel.SUCCESS]: "✔",
    [LogLevel.WARN]: "⚠",
    [LogLevel.ERROR]: "✖",
    [LogLevel.TIP]: "▸",
    [LogLevel.GENERIC]: "▸",
    [LogLevel.SUGGESTION]: "🔍",
    [LogLevel.INPUT]: "❔",
  } as const,

  colors: {
    [LogLevel.DEBUG]: chalk.bold.green,
    [LogLevel.INFO]: chalk.bold.cyan,
    [LogLevel.SUCCESS]: chalk.bold.green,
    [LogLevel.WARN]: chalk.bold.yellow,
    [LogLevel.ERROR]: chalk.bold.red,
    [LogLevel.TIP]: chalk.bold.white,
    [LogLevel.GENERIC]: chalk.white,
    [LogLevel.SUGGESTION]: chalk.bold.cyan,
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
    [LogLevel.SUGGESTION]: "",
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

    if (level === LogLevel.SUGGESTION) {
      return `${prefix}\n${colors[level](`${icons[level]} ${message}`)}`;
    }

    if (level === LogLevel.TIP) {
      return `${prefix}${colors[level](
        ` ${icons[level]} ${labels[level]} `
      )}${message}`;
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
    console.log(chalk.bold.green("\n🔍 Debug mode enabled\n"));
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
   * Internal logging method for string arguments (backward compatibility)
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

  // Template literal methods (preferred)
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

  // String-based methods (for error factory and backward compatibility)
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

  static suggestion(text: string): void {
    console.log(this.formatMessage(text, LogLevel.SUGGESTION));
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

  // Enhanced default value methods
  static defaultValueInfo(message: string, overrideCommand: string): void {
    if (this.config.level <= LogLevel.INFO) {
      console.log(this.formatMessage(message, LogLevel.INFO));
      console.log(chalk.gray`   Override with: ${overrideCommand}\n`);
    }
  }

  static commandValueTip(message: string, overrideCommand: string): void {
    if (this.config.level <= LogLevel.TIP) {
      console.log(this.formatMessage(message, LogLevel.TIP));
      console.log(chalk.gray`   Override with: ${overrideCommand}\n`);
    }
  }

  // Debug object logging
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

  // Timing utility
  static timing(label: string, timeMs: number): void {
    const formattedTime =
      timeMs < 1000
        ? `${timeMs.toFixed(1)}ms`
        : `${(timeMs / 1000).toFixed(2)}s`;

    console.log(chalk.gray`⏱ ${label}: ${formattedTime}`);
  }

  // File list utilities (updated names for consistency)
  static warnfileList(title: string, files: string[]): void {
    if (files.length === 0) return;
    Logger.warn`${title}:`;
    files.forEach((file) => {
      console.log(chalk.gray`  - ${file}`);
    });
  }

  static infofileList(title: string, files: string[]): void {
    if (files.length === 0) return;
    Logger.info`${title}:`;
    files.forEach((file) => {
      console.log(chalk.gray`  - ${file}`);
    });
  }

  static errorFileList(title: string, files: string[]): void {
    if (files.length === 0) return;
    Logger.errorString(`${title}:`);
    files.forEach((file) => {
      console.log(chalk.gray`  - ${file}`);
    });
  }

  // src/utils/logger.ts - Complete updated showReferenceCommands method

  static showReferenceCommands(): void {
    this.header("Conductor CLI Command Reference");

    // Global options displayed at the top
    this.generic(
      chalk.bold.yellow("Global Options (available for all commands):")
    );
    this.generic(
      chalk.gray("  --debug           Enable detailed debug logging")
    );
    this.generic(chalk.gray("  --config <path>   Use configuration file"));
    this.generic(
      chalk.gray("  --help            Show help for specific command")
    );
    this.generic("");

    // ==========================================
    // ELASTICSEARCH UPLOAD COMMAND
    // ==========================================
    this.generic(chalk.bold.magenta("━━━ Elasticsearch Upload ━━━"));
    this.generic(chalk.white("conductor esUpload -f data.csv"));
    this.generic("");
    this.generic(chalk.bold.cyan("Description:"));
    this.generic(chalk.gray("  Upload CSV data to Elasticsearch index"));
    this.generic("");
    this.generic(chalk.bold.cyan("Required Options:"));
    this.generic(chalk.gray("  -f, --file <paths...>     CSV files to upload"));
    this.generic("");
    this.generic(chalk.bold.cyan("Optional Options:"));
    this.generic(
      chalk.gray("  -i, --index <name>        Target Elasticsearch index")
    );
    this.generic(
      chalk.gray("  -b, --batch-size <n>      Batch size (default: 1000)")
    );
    this.generic(
      chalk.gray("  --delimiter <char>        CSV delimiter (default: ,)")
    );
    this.generic(
      chalk.gray(
        "  --url <url>               Elasticsearch URL (default: http://localhost:9200)"
      )
    );
    this.generic(
      chalk.gray(
        "  --user <username>         Elasticsearch username (default: elastic)"
      )
    );
    this.generic(
      chalk.gray(
        "  --password <password>     Elasticsearch password (default: myelasticpassword)"
      )
    );
    this.generic(
      chalk.gray("  -o, --output <path>       Output directory for logs")
    );
    this.generic(
      chalk.gray(
        "  --force                   Force overwrite of existing files"
      )
    );
    this.generic("");
    this.generic(chalk.bold.cyan("Examples:"));
    this.generic(chalk.gray("  conductor esUpload -f data.csv -i my-index"));
    this.generic(
      chalk.gray(
        "  conductor esUpload -f data1.csv data2.csv -i my-index -b 2000"
      )
    );
    this.generic(
      chalk.gray(
        "  conductor esUpload -f data.csv --url http://es.company.com:9200 --user admin"
      )
    );
    this.generic("");

    // ==========================================
    // POSTGRESQL UPLOAD COMMAND
    // ==========================================
    this.generic(chalk.bold.magenta("━━━ PostgreSQL Upload ━━━"));
    this.generic(chalk.white("conductor postgresUpload -f data.csv -t users"));
    this.generic("");
    this.generic(chalk.bold.cyan("Description:"));
    this.generic(chalk.gray("  Upload CSV data to PostgreSQL database table"));
    this.generic("");
    this.generic(chalk.bold.cyan("Required Options:"));
    this.generic(chalk.gray("  -f, --file <paths...>     CSV files to upload"));
    this.generic(
      chalk.gray("  -t, --table <name>        Target PostgreSQL table")
    );
    this.generic("");
    this.generic(chalk.bold.cyan("Optional Options:"));
    this.generic(
      chalk.gray("  -b, --batch-size <n>      Batch size (default: 1000)")
    );
    this.generic(
      chalk.gray("  --delimiter <char>        CSV delimiter (default: ,)")
    );
    this.generic(
      chalk.gray(
        "  --host <host>             PostgreSQL host (default: localhost)"
      )
    );
    this.generic(
      chalk.gray("  --port <port>             PostgreSQL port (default: 5435)")
    );
    this.generic(
      chalk.gray(
        "  --database <name>         Database name (default: postgres)"
      )
    );
    this.generic(
      chalk.gray(
        "  --user <username>         PostgreSQL username (default: admin)"
      )
    );
    this.generic(
      chalk.gray(
        "  --password <password>     PostgreSQL password (default: admin123)"
      )
    );
    this.generic(
      chalk.gray(
        "  --connection-string <url> PostgreSQL connection string (overrides individual options)"
      )
    );
    this.generic(chalk.gray("  --ssl                     Use SSL connection"));
    this.generic(
      chalk.gray(
        "  --max-connections <n>     Maximum pool connections (default: 20)"
      )
    );
    this.generic(
      chalk.gray(
        "  --add-metadata            Add submission metadata to records"
      )
    );
    this.generic(
      chalk.gray("  -o, --output <path>       Output directory for logs")
    );
    this.generic(
      chalk.gray(
        "  --force                   Force overwrite of existing files"
      )
    );
    this.generic("");
    this.generic(chalk.bold.cyan("Examples:"));
    this.generic(
      chalk.gray("  conductor postgresUpload -f users.csv -t users")
    );
    this.generic(
      chalk.gray(
        "  conductor postgresUpload -f orders.csv -t orders --database myapp"
      )
    );
    this.generic(
      chalk.gray(
        "  conductor postgresUpload -f data.csv -t data --port 5432 --user postgres"
      )
    );
    this.generic(
      chalk.gray(
        "  conductor postgresUpload -f data.csv -t data --connection-string postgresql://user:pass@host:5432/db"
      )
    );
    this.generic("");

    // ==========================================
    // POSTGRESQL TO ELASTICSEARCH INDEX COMMAND
    // ==========================================
    this.generic(
      chalk.bold.magenta("━━━ PostgreSQL to Elasticsearch Index ━━━")
    );
    this.generic(
      chalk.white("conductor postgresIndex -t demo_data -i demo_index")
    );
    this.generic("");
    this.generic(chalk.bold.cyan("Description:"));
    this.generic(
      chalk.gray(
        "  Index data from PostgreSQL table directly into Elasticsearch"
      )
    );
    this.generic("");
    this.generic(chalk.bold.cyan("Required Options:"));
    this.generic(
      chalk.gray("  -t, --table <name>        Source PostgreSQL table")
    );
    this.generic(
      chalk.gray("  -i, --index <name>        Target Elasticsearch index")
    );
    this.generic("");
    this.generic(chalk.bold.cyan("PostgreSQL Options:"));
    this.generic(
      chalk.gray(
        "  --host <host>             PostgreSQL host (default: localhost)"
      )
    );
    this.generic(
      chalk.gray("  --port <port>             PostgreSQL port (default: 5435)")
    );
    this.generic(
      chalk.gray("  --database <name>         PostgreSQL database name")
    );
    this.generic(
      chalk.gray(
        "  --user <username>         PostgreSQL username (default: admin)"
      )
    );
    this.generic(
      chalk.gray(
        "  --password <password>     PostgreSQL password (default: admin123)"
      )
    );
    this.generic(
      chalk.gray("  --connection-string <url> PostgreSQL connection string")
    );
    this.generic(chalk.gray("  --ssl                     Use SSL connection"));
    this.generic("");
    this.generic(chalk.bold.cyan("Elasticsearch Options:"));
    this.generic(
      chalk.gray(
        "  --url <url>               Elasticsearch URL (default: http://localhost:9200)"
      )
    );
    this.generic(
      chalk.gray(
        "  --es-user <username>      Elasticsearch username (default: elastic)"
      )
    );
    this.generic(
      chalk.gray("  --es-password <password>  Elasticsearch password")
    );
    this.generic("");
    this.generic(chalk.bold.cyan("Other Options:"));
    this.generic(
      chalk.gray("  -b, --batch-size <n>      Batch size (default: 1000)")
    );
    this.generic(
      chalk.gray("  -o, --output <path>       Output directory for logs")
    );
    this.generic("");
    this.generic(chalk.bold.cyan("Examples:"));
    this.generic(
      chalk.gray("  conductor postgresIndex -t demo_data -i demo_index")
    );
    this.generic(
      chalk.gray(
        "  conductor postgresIndex -t users -i users_index --database myapp"
      )
    );
    this.generic(
      chalk.gray(
        "  conductor postgresIndex -t data -i data_index --host db.company.com --port 5432"
      )
    );
    this.generic("");

    // ==========================================
    // MAESTRO REPOSITORY INDEXING COMMAND
    // ==========================================
    this.generic(chalk.bold.magenta("━━━ Maestro Repository Indexing ━━━"));
    this.generic(
      chalk.white("conductor maestroIndex --repository-code lyric.overture")
    );
    this.generic("");
    this.generic(chalk.bold.cyan("Description:"));
    this.generic(
      chalk.gray(
        "  Index a repository with optional organization and ID filtering"
      )
    );
    this.generic("");
    this.generic(chalk.bold.cyan("Required Options:"));
    this.generic(
      chalk.gray("  --repository-code <code>  Repository code to index")
    );
    this.generic("");
    this.generic(chalk.bold.cyan("Optional Options:"));
    this.generic(
      chalk.gray(
        "  --index-url <url>         Indexing service URL (default: http://localhost:11235)"
      )
    );
    this.generic(
      chalk.gray("  --organization <name>     Filter to specific organization")
    );
    this.generic(
      chalk.gray("  --id <id>                 Index only specific document ID")
    );
    this.generic(
      chalk.gray("  -o, --output <path>       Output directory for logs")
    );
    this.generic(
      chalk.gray("  --force                   Skip confirmation prompts")
    );
    this.generic("");
    this.generic(chalk.bold.cyan("Examples:"));
    this.generic(
      chalk.gray("  conductor maestroIndex --repository-code lyric.overture")
    );
    this.generic(
      chalk.gray(
        "  conductor maestroIndex --repository-code song.overture --organization OICR"
      )
    );
    this.generic(
      chalk.gray(
        "  conductor maestroIndex --repository-code ego.overture --id DO123"
      )
    );
    this.generic("");

    // ==========================================
    // LECTERN SCHEMA UPLOAD COMMAND
    // ==========================================
    this.generic(chalk.bold.magenta("━━━ Lectern Schema Upload ━━━"));
    this.generic(chalk.white("conductor lecternUpload -s dictionary.json"));
    this.generic("");
    this.generic(chalk.bold.cyan("Description:"));
    this.generic(chalk.gray("  Upload dictionary schema to Lectern server"));
    this.generic("");
    this.generic(chalk.bold.cyan("Required Options:"));
    this.generic(
      chalk.gray("  -s, --schema-file <path>  Schema JSON file to upload")
    );
    this.generic("");
    this.generic(chalk.bold.cyan("Optional Options:"));
    this.generic(
      chalk.gray(
        "  -u, --lectern-url <url>   Lectern server URL (default: http://localhost:3031)"
      )
    );
    this.generic(
      chalk.gray("  -t, --auth-token <token>  Authentication token")
    );
    this.generic(
      chalk.gray("  -o, --output <path>       Output directory for logs")
    );
    this.generic(
      chalk.gray(
        "  --force                   Force overwrite of existing files"
      )
    );
    this.generic("");
    this.generic(chalk.bold.cyan("Examples:"));
    this.generic(
      chalk.gray("  conductor lecternUpload -s data-dictionary.json")
    );
    this.generic(
      chalk.gray(
        "  conductor lecternUpload -s schema.json -u http://lectern.company.com:3031"
      )
    );
    this.generic(
      chalk.gray("  conductor lecternUpload -s schema.json -t myAuthToken123")
    );
    this.generic("");

    // ==========================================
    // LYRIC DICTIONARY REGISTRATION COMMAND
    // ==========================================
    this.generic(chalk.bold.magenta("━━━ Lyric Dictionary Registration ━━━"));
    this.generic(
      chalk.white(
        "conductor lyricRegister -c category1 --dict-name dictionary1 -v 1.0 -e donor"
      )
    );
    this.generic("");
    this.generic(chalk.bold.cyan("Description:"));
    this.generic(
      chalk.gray("  Register a dictionary from Lectern with Lyric service")
    );
    this.generic("");
    this.generic(chalk.bold.cyan("Required Options:"));
    this.generic(
      chalk.gray("  -c, --category-name <name>       Category name")
    );
    this.generic(
      chalk.gray("  --dict-name <name>               Dictionary name")
    );
    this.generic(
      chalk.gray("  -v, --dictionary-version <ver>   Dictionary version")
    );
    this.generic(
      chalk.gray(
        "  -e, --default-centric-entity <entity>  Default centric entity (must exist in dictionary)"
      )
    );
    this.generic("");
    this.generic(chalk.bold.cyan("Optional Options:"));
    this.generic(
      chalk.gray(
        "  -u, --lyric-url <url>            Lyric server URL (default: http://localhost:3030)"
      )
    );
    this.generic(
      chalk.gray(
        "  -l, --lectern-url <url>          Lectern server URL (default: http://localhost:3031)"
      )
    );
    this.generic(
      chalk.gray("  -t, --auth-token <token>         Authentication token")
    );
    this.generic(
      chalk.gray("  -o, --output <path>              Output directory for logs")
    );
    this.generic(
      chalk.gray(
        "  --force                          Force overwrite of existing files"
      )
    );
    this.generic("");
    this.generic(chalk.bold.cyan("Examples:"));
    this.generic(
      chalk.gray(
        "  conductor lyricRegister -c research --dict-name cancer-data -v 2.0 -e donor"
      )
    );
    this.generic(
      chalk.gray(
        "  conductor lyricRegister -c clinical --dict-name patient-data -v 1.5 -e patient"
      )
    );
    this.generic("");

    // ==========================================
    // LYRIC DATA UPLOAD COMMAND
    // ==========================================
    this.generic(chalk.bold.magenta("━━━ Lyric Data Upload ━━━"));
    this.generic(chalk.white("conductor lyricUpload -d ./data-directory"));
    this.generic("");
    this.generic(chalk.bold.cyan("Description:"));
    this.generic(
      chalk.gray(
        "  Upload CSV data files to Lyric service (supports single files or directories)"
      )
    );
    this.generic("");
    this.generic(chalk.bold.cyan("Required Options:"));
    this.generic(
      chalk.gray(
        "  -d, --data-directory <path>  Directory containing CSV files OR single CSV file"
      )
    );
    this.generic("");
    this.generic(chalk.bold.cyan("Optional Options:"));
    this.generic(
      chalk.gray(
        "  -u, --lyric-url <url>        Lyric server URL (default: http://localhost:3030)"
      )
    );
    this.generic(
      chalk.gray(
        "  -l, --lectern-url <url>      Lectern server URL (default: http://localhost:3031)"
      )
    );
    this.generic(
      chalk.gray("  -c, --category-id <id>       Category ID (default: 1)")
    );
    this.generic(
      chalk.gray(
        "  -g, --organization <name>    Organization name (default: OICR)"
      )
    );
    this.generic(
      chalk.gray(
        "  -m, --max-retries <number>   Maximum retry attempts (default: 10)"
      )
    );
    this.generic(
      chalk.gray(
        "  -r, --retry-delay <ms>       Delay between retries (default: 1000ms)"
      )
    );
    this.generic(
      chalk.gray("  -o, --output <path>          Output directory for logs")
    );
    this.generic(
      chalk.gray(
        "  --force                      Force overwrite of existing files"
      )
    );
    this.generic("");
    this.generic(chalk.bold.cyan("Examples:"));
    this.generic(chalk.gray("  conductor lyricUpload -d ./csv-files"));
    this.generic(chalk.gray("  conductor lyricUpload -d ./donor.csv"));
    this.generic(
      chalk.gray("  conductor lyricUpload -d ./data -c 2 -g MyOrganization")
    );
    this.generic("");

    // ==========================================
    // SONG SCHEMA UPLOAD COMMAND
    // ==========================================
    this.generic(chalk.bold.magenta("━━━ SONG Schema Upload ━━━"));
    this.generic(chalk.white("conductor songUploadSchema -s schema.json"));
    this.generic("");
    this.generic(chalk.bold.cyan("Description:"));
    this.generic(chalk.gray("  Upload analysis schema to SONG server"));
    this.generic("");
    this.generic(chalk.bold.cyan("Required Options:"));
    this.generic(
      chalk.gray("  -s, --schema-file <path>     Schema JSON file to upload")
    );
    this.generic("");
    this.generic(chalk.bold.cyan("Optional Options:"));
    this.generic(
      chalk.gray(
        "  -u, --song-url <url>         SONG server URL (default: http://localhost:8080)"
      )
    );
    this.generic(
      chalk.gray(
        "  -t, --auth-token <token>     Authentication token (default: 123)"
      )
    );
    this.generic(
      chalk.gray("  -o, --output <path>          Output directory for logs")
    );
    this.generic(
      chalk.gray(
        "  --force                      Force overwrite of existing files"
      )
    );
    this.generic("");
    this.generic(chalk.bold.cyan("Examples:"));
    this.generic(
      chalk.gray("  conductor songUploadSchema -s analysis-schema.json")
    );
    this.generic(
      chalk.gray(
        "  conductor songUploadSchema -s schema.json -u http://song-api:8080"
      )
    );
    this.generic(
      chalk.gray(
        "  conductor songUploadSchema -s schema.json -t myAuthToken123"
      )
    );
    this.generic("");

    // ==========================================
    // SONG CREATE STUDY COMMAND
    // ==========================================
    this.generic(chalk.bold.magenta("━━━ SONG Create Study ━━━"));
    this.generic(chalk.white("conductor songCreateStudy -i study-id"));
    this.generic("");
    this.generic(chalk.bold.cyan("Description:"));
    this.generic(chalk.gray("  Create a new study in SONG server"));
    this.generic("");
    this.generic(chalk.bold.cyan("Required Options:"));
    this.generic(chalk.gray("  -i, --study-id <id>          Study ID"));
    this.generic("");
    this.generic(chalk.bold.cyan("Optional Options:"));
    this.generic(
      chalk.gray(
        "  -u, --song-url <url>         SONG server URL (default: http://localhost:8080)"
      )
    );
    this.generic(
      chalk.gray(
        "  --name <name>                Study display name (defaults to study ID)"
      )
    );
    this.generic(
      chalk.gray(
        "  -g, --organization <name>    Organization name (default: OICR)"
      )
    );
    this.generic(
      chalk.gray(
        "  --description <text>         Study description (default: string)"
      )
    );
    this.generic(
      chalk.gray(
        "  -t, --auth-token <token>     Authentication token (default: 123)"
      )
    );
    this.generic(
      chalk.gray(
        "  --force                      Force creation even if study exists"
      )
    );
    this.generic(
      chalk.gray("  -o, --output <path>          Output directory for logs")
    );
    this.generic("");
    this.generic(chalk.bold.cyan("Examples:"));
    this.generic(chalk.gray("  conductor songCreateStudy -i my-study"));
    this.generic(
      chalk.gray(
        "  conductor songCreateStudy -i research-001 --name 'Cancer Research Study'"
      )
    );
    this.generic(
      chalk.gray(
        "  conductor songCreateStudy -i study-123 -g MyOrganization --description 'Clinical trial data'"
      )
    );
    this.generic("");

    // ==========================================
    // SONG SUBMIT ANALYSIS COMMAND
    // ==========================================
    this.generic(
      chalk.bold.magenta("━━━ SONG Submit Analysis & File Upload ━━━")
    );
    this.generic(chalk.white("conductor songSubmitAnalysis -a analysis.json"));
    this.generic("");
    this.generic(chalk.bold.cyan("Description:"));
    this.generic(
      chalk.gray(
        "  Submit analysis to SONG and upload associated files to Score (combined workflow)"
      )
    );
    this.generic(
      chalk.yellow(
        "  ⚠️  EXPERIMENTAL: This feature requires Docker containers for Score operations"
      )
    );
    this.generic("");
    this.generic(chalk.bold.cyan("Required Options:"));
    this.generic(
      chalk.gray("  -a, --analysis-file <path>   Analysis JSON file to submit")
    );
    this.generic("");
    this.generic(chalk.bold.cyan("Optional Options:"));
    this.generic(
      chalk.gray(
        "  -u, --song-url <url>         SONG server URL (default: http://localhost:8080)"
      )
    );
    this.generic(
      chalk.gray(
        "  -s, --score-url <url>        Score server URL (default: http://localhost:8087)"
      )
    );
    this.generic(
      chalk.gray("  -i, --study-id <id>          Study ID (default: demo)")
    );
    this.generic(
      chalk.gray(
        "  -d, --data-dir <path>        Directory containing data files (default: ./data)"
      )
    );
    this.generic(
      chalk.gray(
        "  --output-dir <path>          Directory for manifest output (default: ./output)"
      )
    );
    this.generic(
      chalk.gray("  -m, --manifest-file <path>   Path for manifest file")
    );
    this.generic(
      chalk.gray(
        "  -t, --auth-token <token>     Authentication token (default: 123)"
      )
    );
    this.generic(
      chalk.gray(
        "  --allow-duplicates           Allow duplicate analysis submissions"
      )
    );
    this.generic(
      chalk.gray(
        "  --ignore-undefined-md5       Ignore files with undefined MD5 checksums"
      )
    );
    this.generic(
      chalk.gray("  -o, --output <path>          Output directory for logs")
    );
    this.generic(
      chalk.gray(
        "  --force                      Force studyId from command line"
      )
    );
    this.generic("");
    this.generic(chalk.bold.cyan("Examples:"));
    this.generic(chalk.gray("  conductor songSubmitAnalysis -a analysis.json"));
    this.generic(
      chalk.gray(
        "  conductor songSubmitAnalysis -a analysis.json -i my-study -d ./my-data"
      )
    );
    this.generic(
      chalk.gray(
        "  conductor songSubmitAnalysis -a analysis.json --allow-duplicates"
      )
    );
    this.generic("");

    // ==========================================
    // SONG PUBLISH ANALYSIS COMMAND
    // ==========================================
    this.generic(chalk.bold.magenta("━━━ SONG Publish Analysis ━━━"));
    this.generic(chalk.white("conductor songPublishAnalysis -a AN123456"));
    this.generic("");
    this.generic(chalk.bold.cyan("Description:"));
    this.generic(chalk.gray("  Publish a submitted analysis in SONG server"));
    this.generic("");
    this.generic(chalk.bold.cyan("Required Options:"));
    this.generic(
      chalk.gray("  -a, --analysis-id <id>       Analysis ID to publish")
    );
    this.generic("");
    this.generic(chalk.bold.cyan("Optional Options:"));
    this.generic(
      chalk.gray(
        "  -u, --song-url <url>         SONG server URL (default: http://localhost:8080)"
      )
    );
    this.generic(
      chalk.gray("  -i, --study-id <id>          Study ID (default: demo)")
    );
    this.generic(
      chalk.gray(
        "  -t, --auth-token <token>     Authentication token (default: 123)"
      )
    );
    this.generic(
      chalk.gray(
        "  --ignore-undefined-md5       Ignore files with undefined MD5 checksums"
      )
    );
    this.generic(
      chalk.gray("  -o, --output <path>          Output directory for logs")
    );
    this.generic("");
    this.generic(chalk.bold.cyan("Examples:"));
    this.generic(chalk.gray("  conductor songPublishAnalysis -a AN123456"));
    this.generic(
      chalk.gray("  conductor songPublishAnalysis -a AN789012 -i my-study")
    );
    this.generic(
      chalk.gray(
        "  conductor songPublishAnalysis -a AN345678 --ignore-undefined-md5"
      )
    );
    this.generic("");

    // ==========================================
    // FOOTER INFORMATION
    // ==========================================
    this.generic(chalk.bold.yellow("━━━ Additional Information ━━━"));
    this.generic("");
    this.generic(chalk.bold.cyan("Environment Variables:"));
    this.generic(
      chalk.gray("  Most options can be set via environment variables:")
    );
    this.generic(
      chalk.gray(
        "  - ELASTICSEARCH_URL, ELASTICSEARCH_USER, ELASTICSEARCH_PASSWORD"
      )
    );
    this.generic(
      chalk.gray("  - PGHOST, PGPORT, PGDATABASE, PGUSER, PGPASSWORD")
    );
    this.generic(chalk.gray("  - LECTERN_URL, LYRIC_URL, SONG_URL, SCORE_URL"));
    this.generic(chalk.gray("  - AUTH_TOKEN, CATEGORY_ID, ORGANIZATION"));
    this.generic("");
    this.generic(chalk.bold.cyan("Getting Help:"));
    this.generic(
      chalk.gray(
        "  conductor <command> --help   Show detailed help for specific command"
      )
    );
    this.generic(
      chalk.gray("  conductor --help             Show this command reference")
    );
    this.generic("");
    this.generic(chalk.bold.cyan("Debug Mode:"));
    this.generic(
      chalk.gray("  Add --debug to any command for detailed execution logs")
    );
    this.generic("");
  }
}
