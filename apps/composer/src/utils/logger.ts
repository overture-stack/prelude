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

interface CommandExample {
  name: string;
  command: string;
  description?: string;
  options: Array<{
    flag: string;
    description: string;
    required?: boolean;
  }>;
  examples: string[];
  subExamples?: Array<{
    title: string;
    command: string;
  }>;
}

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
    console.log(`${chalk.bold.cyan(" \n" + text + "  \n")}`);
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

  // Improved showReferenceCommands method - more maintainable and readable
  static showReferenceCommands(): void {
    this.generic("");
    const commands: CommandExample[] = [
      {
        name: "Generate a PostgreSQL Table from CSV",
        command: "composer -p PostgresTable -f patient_data.csv",
        options: [
          {
            flag: "-p, --profile <profile>",
            description: "Execution profile (default: default)",
          },
          {
            flag: "-f, --files <paths...>",
            description: "Input file paths (CSV)",
            required: true,
          },
          {
            flag: "-o, --output <path>",
            description: "Output file path for generated SQL",
          },
          { flag: "--table-name <n>", description: "PostgreSQL table name" },
          { flag: "--schema <n>", description: "PostgreSQL schema name" },
          {
            flag: "--include-constraints",
            description: "Include primary key constraints",
          },
          {
            flag: "--include-indexes",
            description: "Include database indexes",
          },
          {
            flag: "--delimiter <char>",
            description: "CSV delimiter (default: ,)",
          },
        ],
        examples: [
          "composer -p PostgresTable -f patient_data.csv -o create_patients.sql --table-name patients --schema clinical --include-constraints --include-indexes",
        ],
      },
      {
        name: "Generate a base Lectern Data Dictionary from CSV or JSON",
        command:
          "composer -p LecternDictionary -f clinical.csv demographics.csv",
        options: [
          {
            flag: "-p, --profile <profile>",
            description: "Execution profile (default: default)",
          },
          {
            flag: "-f, --files <paths...>",
            description: "Input file paths (CSV or JSON, space separated)",
            required: true,
          },
          {
            flag: "-o, --output <path>",
            description: "Output file path for generated dictionary",
          },
          {
            flag: "-n, --name <n>",
            description: "Dictionary name (default: lectern_dictionary)",
          },
          {
            flag: "-d, --description <text>",
            description:
              "Dictionary description (default: Generated dictionary from CSV files)",
          },
          {
            flag: "-v, --version <version>",
            description: "Dictionary version (default: 1.0.0)",
          },
          {
            flag: "--delimiter <char>",
            description: "CSV delimiter (default: ,)",
          },
        ],
        examples: [
          "composer -p LecternDictionary -f clinical.csv demographics.csv -o dictionary.json -n 'Clinical Dictionary' -v '2.0.0'",
        ],
      },

      {
        name: "Generate a base Song Schema from CSV or JSON",
        command: "composer -p SongSchema -f schema-template.json",
        options: [
          {
            flag: "-p, --profile <profile>",
            description: "Execution profile (default: default)",
          },
          {
            flag: "-f, --files <paths...>",
            description: "Input file paths (CSV or JSON, space separated)",
            required: true,
          },
          {
            flag: "-o, --output <path>",
            description: "Output file path for generated schema",
          },
          {
            flag: "-n, --name <n>",
            description: "Schema name (default: song_schema)",
          },
          {
            flag: "--file-types <types...>",
            description: "Allowed file types for Song schema",
          },
        ],
        examples: [
          "composer -p SongSchema -f data-model.json -o song-schema.json -n 'Analysis Schema' --file-types bam vcf fastq",
        ],
      },

      {
        name: "Generate an Elasticsearch mapping template from CSV or JSON",
        command: "composer -p ElasticsearchMapping -f data.csv",
        options: [
          {
            flag: "-p, --profile <profile>",
            description: "Execution profile (default: default)",
          },
          {
            flag: "-f, --files <paths...>",
            description:
              "Input file paths (CSV, JSON, or Lectern dictionary, space separated)",
            required: true,
          },
          {
            flag: "-o, --output <path>",
            description: "Output file path for generated mapping",
          },
          {
            flag: "-i, --index <n>",
            description: "Elasticsearch index name (default: data)",
          },
          {
            flag: "--shards <number>",
            description: "Number of Elasticsearch shards (default: 1)",
          },
          {
            flag: "--replicas <number>",
            description: "Number of Elasticsearch replicas (default: 1)",
          },
          {
            flag: "--delimiter <char>",
            description: "CSV delimiter (default: ,)",
          },
          {
            flag: "--ignore-fields <fields...>",
            description: "Field names to exclude from mapping",
          },
          {
            flag: "--skip-metadata",
            description: "Skip adding submission metadata to mapping",
          },
        ],
        examples: [],
        subExamples: [
          {
            title: "From CSV files",
            command:
              "composer -p ElasticsearchMapping -f data.csv metadata.csv -i my_index --shards 3 --replicas 2 -o es-mapping.json",
          },
          {
            title: "From JSON files",
            command:
              "composer -p ElasticsearchMapping -f donor_data.json --ignore-fields entityName organization isValid id",
          },
          {
            title: "From Lectern Dictionary",
            command:
              "composer -p ElasticsearchMapping -f clinical-dictionary.json -i clinical_data -o mapping.json",
          },
        ],
      },

      {
        name: "Generate Arranger Config files from an Elasticsearch mapping (JSON)",
        command: "composer -p ArrangerConfigs -f mapping.json",
        options: [
          {
            flag: "-p, --profile <profile>",
            description: "Execution profile (default: default)",
          },
          {
            flag: "-f, --files <paths...>",
            description: "Input file mapping (JSON)",
            required: true,
          },
          {
            flag: "-o, --output <path>",
            description: "Output file path for generated configs",
          },
          {
            flag: "--arranger-doc-type <type>",
            description:
              "Arranger document type (file or analysis) (default: file)",
          },
          {
            flag: "-i, --index <n>",
            description: "Elasticsearch index name (default: data)",
          },
        ],
        examples: [
          "composer -p ArrangerConfigs -f mapping.json -o arranger-config/ --arranger-doc-type analysis -i clinical_data",
        ],
      },
    ];

    // Render each command
    commands.forEach((cmd) => {
      this.generic(chalk.bold.magenta(`${cmd.name}:`));
      this.generic(chalk.white(cmd.command));
      this.generic("");

      if (cmd.options.length > 0) {
        this.generic(chalk.gray(" Options:"));
        cmd.options.forEach((opt) => {
          this.generic(
            chalk.gray(`   ${opt.flag.padEnd(35)} ${opt.description}`)
          );
        });
      }

      this.generic("");

      // Handle regular examples
      if (cmd.examples.length > 0) {
        cmd.examples.forEach((example) => {
          this.generic(chalk.gray(` Example: ${example}`));
        });
      }

      // Handle sub-examples (like for Elasticsearch)
      if (cmd.subExamples) {
        cmd.subExamples.forEach((subEx) => {
          this.generic(chalk.bold.cyan(`    ${subEx.title}:`));
          this.generic(chalk.gray(`    ${subEx.command}`));
        });
      }

      this.generic("");
    });
    this.header("The Composer CLI Tool");
    this.generic("▸ Command options with examples are provided above.");
    this.generic(
      "▸ Generates base templates for key Overture configuration files."
    );
    this.generic(
      "▸ More information can be found from our documentation site here: https://docs.overture.bio/docs/platform-tools/composer\n"
    );
  }
}
