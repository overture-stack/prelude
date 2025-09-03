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
    [LogLevel.INFO]: chalk.bold,
    [LogLevel.SUCCESS]: chalk.bold.green,
    [LogLevel.WARN]: chalk.bold.yellow,
    [LogLevel.ERROR]: chalk.bold.red,
    [LogLevel.TIP]: chalk.bold.white,
    [LogLevel.GENERIC]: chalk.white,
    [LogLevel.SUGGESTION]: chalk.bold,
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
    console.log(`${chalk.bold.cyan(" \n" + text + "  \n")}`);
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

  // Updated showReferenceCommands method with unified upload command
  static showReferenceCommands(): void {
    // Helper function to reduce repetition
    const section = (
      title: string,
      command: string,
      description: string,
      requiredOptions: string[],
      optionalOptions: string[],
      examples: string[]
    ) => {
      this.generic(chalk.bold.magenta(title));
      this.generic(`${description}`);
      this.generic("");

      if (requiredOptions.length > 0) {
        this.generic("  ▸ Required Options:"); // First level indent
        requiredOptions.forEach((opt) => this.generic(chalk.gray(`   ${opt}`))); // Second level indent (6 spaces)
      }

      if (optionalOptions.length > 0) {
        this.generic("  ▸ Optional Options:"); // First level indent
        optionalOptions.forEach((opt) => this.generic(chalk.gray(`   ${opt}`))); // Second level indent (6 spaces)
      }

      this.generic("  ▸ Examples:"); // First level indent (2 spaces)
      examples.forEach((ex) => this.generic(chalk.gray(`    ${ex}`))); // Second level indent (6 spaces)
      this.generic("");
    };

    // Global options
    this.generic("");
    this.generic(chalk.bold("Global Options (available for all commands):"));
    [
      "--debug           Enable detailed debug logging",
      "--config <path>   Use configuration file",
      "--help            Show help for specific command",
    ].forEach((opt) => this.generic(chalk.gray(`    ${opt}`))); // Added 4 spaces for indentation
    this.generic("");

    this.generic(
      chalk.bold("Environment Variables: ") +
        "Most options can be set via environment variables"
    );
    [
      "- ELASTICSEARCH_URL, ELASTICSEARCH_USER, ELASTICSEARCH_PASSWORD",
      "- PGHOST, PGPORT, PGDATABASE, PGUSER, PGPASSWORD",
      "- LECTERN_URL, LYRIC_URL, SONG_URL, SCORE_URL",
      "- AUTH_TOKEN, CATEGORY_ID, ORGANIZATION",
    ].forEach((opt) => this.generic(chalk.gray(`    ${opt}`))); // Added 4 spaces for indentation
    this.generic("");

    // Updated unified upload command section
    section(
      "Upload data to PostgreSQL and/or Elasticsearch",
      "conductor upload -f data.csv -t users",
      "Unified upload command that handles PostgreSQL uploads, Elasticsearch uploads, or both based on parameters provided",
      ["-f, --file <paths...>     CSV files to upload"],
      [
        "Database Target Options:",
        "  -t, --table <name>        PostgreSQL table name (for PostgreSQL upload)",
        "  -i, --index <name>        Elasticsearch index name (for Elasticsearch upload)",
        "",
        "PostgreSQL Options (used when -t is specified):",
        "  --host <host>             PostgreSQL host (default: localhost)",
        "  --port <port>             PostgreSQL port (default: 5435)",
        "  --database <name>         PostgreSQL database name (default: postgres)",
        "  --user <username>         PostgreSQL username (default: admin)",
        "  --password <password>     PostgreSQL password (default: admin123)",
        "  --connection-string <url> PostgreSQL connection string (overrides individual options)",
        "  --ssl                     Use SSL connection",
        "  --max-connections <n>     Maximum pool connections (default: 20)",
        "  --add-metadata            Add submission metadata to records",
        "",
        "Elasticsearch Options (used when -i is specified):",
        "  --url <url>               Elasticsearch URL (default: http://localhost:9200)",
        "  --es-user <username>      Elasticsearch username (default: elastic)",
        "  --es-password <password>  Elasticsearch password (default: myelasticpassword)",
        "",
        "General Options:",
        "  -b, --batch-size <n>      Batch size for uploads (default: 1000)",
        "  --delimiter <char>        CSV delimiter character (default: ,)",
        "  -o, --output <path>       Output directory for logs",
        "  --force                   Force overwrite of existing files / Skip confirmation prompts",
      ],
      [
        "# PostgreSQL upload only",
        "conductor upload -f data.csv -t users",
        "conductor upload -f orders.csv -t orders --database myapp --port 5432",
        "",
        "# Elasticsearch upload only",
        "conductor upload -f data.csv -i my-index",
        "conductor upload -f logs.csv -i log-index --url http://es.company.com:9200",
        "",
        "# Combined workflow: PostgreSQL upload followed by Elasticsearch indexing",
        "conductor upload -f data.csv -t users -i users-index",
        "conductor upload -f products.csv -t products -i products-search --batch-size 2000",
        "",
        "# Multiple files",
        "conductor upload -f file1.csv file2.csv -t combined_data -i combined-index",
      ]
    );

    section(
      "Index Db data into Elasticsearch",
      "conductor index -t demo_data -i demo_index",
      "Index data from PostgreSQL table directly into Elasticsearch",
      [
        "-t, --table <name>        Source PostgreSQL table",
        "-i, --index <name>        Target Elasticsearch index",
      ],
      [
        "--host <host>             PostgreSQL host (default: localhost)",
        "--port <port>             PostgreSQL port (default: 5435)",
        "--database <name>         PostgreSQL database name",
        "--user <username>         PostgreSQL username (default: admin)",
        "--password <password>     PostgreSQL password (default: admin123)",
        "--connection-string <url> PostgreSQL connection string",
        "--ssl                     Use SSL connection",
        "--url <url>               Elasticsearch URL (default: http://localhost:9200)",
        "--es-user <username>      Elasticsearch username (default: elastic)",
        "--es-password <password>  Elasticsearch password",
        "-b, --batch-size <n>      Batch size (default: 1000)",
        "-o, --output <path>       Output directory for logs",
      ],
      [
        "conductor index -t demo_data -i demo_index",
        "conductor index -t users -i users_index --database myapp",
        "conductor index -t data -i data_index --host db.company.com --port 5432",
      ]
    );

    section(
      "Index a repository (Db) using Maestro",
      "conductor maestroIndex --repository-code lyric.overture",
      "Index a repository with optional organization and ID filtering",
      ["--repository-code <code>  Repository code to index"],
      [
        "--index-url <url>         Indexing service URL (default: http://localhost:11235)",
        "--organization <name>     Filter to specific organization",
        "--id <id>                 Index only specific document ID",
        "-o, --output <path>       Output directory for logs",
        "--force                   Skip confirmation prompts",
      ],
      [
        "conductor maestroIndex --repository-code lyric.overture",
        "conductor maestroIndex --repository-code song.overture --organization OICR",
        "conductor maestroIndex --repository-code ego.overture --id DO123",
      ]
    );

    section(
      "Upload a data dictionary to Lectern",
      "conductor lecternUpload -s dictionary.json",
      "Upload dictionary schema to Lectern server",
      ["-s, --schema-file <path>  Schema JSON file to upload"],
      [
        "-u, --lectern-url <url>   Lectern server URL (default: http://localhost:3031)",
        "-t, --auth-token <token>  Authentication token",
        "-o, --output <path>       Output directory for logs",
        "--force                   Force overwrite of existing files",
      ],
      [
        "conductor lecternUpload -s data-dictionary.json",
        "conductor lecternUpload -s schema.json -u http://lectern.company.com:3031",
        "conductor lecternUpload -s schema.json -t myAuthToken123",
      ]
    );

    section(
      "Register a dictionary with Lyric",
      "conductor lyricRegister -c category1 --dict-name dictionary1 -v 1.0 -e donor",
      "Register a dictionary from Lectern with Lyric service",
      [
        "-c, --category-name <name>       Category name",
        "--dict-name <name>               Dictionary name",
        "-v, --dictionary-version <ver>   Dictionary version",
        "-e, --default-centric-entity <entity>  Default centric entity (must exist in dictionary)",
      ],
      [
        "-u, --lyric-url <url>            Lyric server URL (default: http://localhost:3030)",
        "-l, --lectern-url <url>          Lectern server URL (default: http://localhost:3031)",
        "-t, --auth-token <token>         Authentication token",
        "-o, --output <path>              Output directory for logs",
        "--force                          Force overwrite of existing files",
      ],
      [
        "conductor lyricRegister -c research --dict-name cancer-data -v 2.0 -e donor",
        "conductor lyricRegister -c clinical --dict-name patient-data -v 1.5 -e patient",
      ]
    );

    section(
      "Upload tabular data to Lyirc",
      "conductor lyricUpload -d ./data-directory",
      "Upload CSV data files to Lyric service (supports single files or directories)",
      [
        "-d, --data-directory <path>  Directory containing CSV files OR single CSV file",
      ],
      [
        "-u, --lyric-url <url>        Lyric server URL (default: http://localhost:3030)",
        "-l, --lectern-url <url>      Lectern server URL (default: http://localhost:3031)",
        "-c, --category-id <id>       Category ID (default: 1)",
        "-g, --organization <name>    Organization name (default: OICR)",
        "-m, --max-retries <number>   Maximum retry attempts (default: 10)",
        "-r, --retry-delay <ms>       Delay between retries (default: 1000ms)",
        "-o, --output <path>          Output directory for logs",
        "--force                      Force overwrite of existing files",
      ],
      [
        "conductor lyricUpload -d ./csv-files",
        "conductor lyricUpload -d ./donor.csv",
        "conductor lyricUpload -d ./data -c 2 -g MyOrganization",
      ]
    );

    section(
      "Upload a Song schema",
      "conductor songUploadSchema -s schema.json",
      "Upload analysis schema to SONG server",
      ["-s, --schema-file <path>     Schema JSON file to upload"],
      [
        "-u, --song-url <url>         SONG server URL (default: http://localhost:8080)",
        "-t, --auth-token <token>     Authentication token (default: 123)",
        "-o, --output <path>          Output directory for logs",
        "--force                      Force overwrite of existing files",
      ],
      [
        "conductor songUploadSchema -s analysis-schema.json",
        "conductor songUploadSchema -s schema.json -u http://song-api:8080",
        "conductor songUploadSchema -s schema.json -t myAuthToken123",
      ]
    );

    section(
      "Create a study for Song",
      "conductor songCreateStudy -i study-id",
      "Create a new study in SONG server",
      ["-i, --study-id <id>          Study ID"],
      [
        "-u, --song-url <url>         SONG server URL (default: http://localhost:8080)",
        "--name <name>                Study display name (defaults to study ID)",
        "-g, --organization <name>    Organization name (default: OICR)",
        "--description <text>         Study description (default: string)",
        "-t, --auth-token <token>     Authentication token (default: 123)",
        "--force                      Force creation even if study exists",
        "-o, --output <path>          Output directory for logs",
      ],
      [
        "conductor songCreateStudy -i my-study",
        "conductor songCreateStudy -i research-001 --name 'Cancer Research Study'",
        "conductor songCreateStudy -i study-123 -g MyOrganization --description 'Clinical trial data'",
      ]
    );

    section(
      "File Upload using Song and Score",
      "conductor songSubmitAnalysis -a metadata.json",
      "Submit your file metadata (metadata.json) to Song and upload associated data files to Score (combined workflow)\n⚠️  EXPERIMENTAL: This feature requires Docker containers for Score operations",
      ["-a, --analysis-file <path>   Analysis JSON file to submit"],
      [
        "-u, --song-url <url>         SONG server URL (default: http://localhost:8080)",
        "-s, --score-url <url>        Score server URL (default: http://localhost:8087)",
        "-i, --study-id <id>          Study ID (default: demo)",
        "-d, --data-dir <path>        Directory containing data files (default: ./data)",
        "--output-dir <path>          Directory for manifest output (default: ./output)",
        "-m, --manifest-file <path>   Path for manifest file",
        "-t, --auth-token <token>     Authentication token (default: 123)",
        "--allow-duplicates           Allow duplicate analysis submissions",
        "--ignore-undefined-md5       Ignore files with undefined MD5 checksums",
        "-o, --output <path>          Output directory for logs",
        "--force                      Force studyId from command line",
      ],
      [
        "conductor songSubmitAnalysis -a analysis.json",
        "conductor songSubmitAnalysis -a analysis.json -i my-study -d ./my-data",
        "conductor songSubmitAnalysis -a analysis.json --allow-duplicates",
      ]
    );

    section(
      "Publish file data uploads",
      "conductor songPublishAnalysis -a AN123456",
      "Publish a submitted analysis in SONG server",
      ["-a, --analysis-id <id>       Analysis ID to publish"],
      [
        "-u, --song-url <url>         SONG server URL (default: http://localhost:8080)",
        "-i, --study-id <id>          Study ID (default: demo)",
        "-t, --auth-token <token>     Authentication token (default: 123)",
        "--ignore-undefined-md5       Ignore files with undefined MD5 checksums",
        "-o, --output <path>          Output directory for logs",
      ],
      [
        "conductor songPublishAnalysis -a AN123456",
        "conductor songPublishAnalysis -a AN789012 -i my-study",
        "conductor songPublishAnalysis -a AN345678 --ignore-undefined-md5",
      ]
    );

    // Footer
    const footerSections = [
      [
        "The Conductor CLI Tool:",
        "▸ Command options with examples are provided above.",
        "▸ Unifies common interactions with Overture platforms into a single CLI",
        "▸ More information can also be found from our documentation site here: https://docs.overture.bio/docs/platform-tools/conductor\n",
      ],
    ];

    footerSections.forEach(([title, ...items]) => {
      this.generic(chalk.cyan.bold(title));
      this.generic("");
      items.forEach((item) => this.generic(`  ${item}`));
    });
  }
}
