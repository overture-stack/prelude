// src/utils/logger.ts - Enhanced logger with standardized template literal usage
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

  static formatInputPrompt(message: string): string {
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
    this.generic(`${chalk.bold.blue(command)}: ${description}`);
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
  static debugObject(label: string, obj: Record<string, unknown>): void {
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
  static warnFileList(title: string, files: string[]): void {
    if (files.length === 0) return;
    Logger.warn`${title}:`;
    files.forEach((file) => {
      console.log(chalk.gray`  - ${file}`);
    });
  }

  static infoFileList(title: string, files: string[]): void {
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

  static showReferenceCommands(): void {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { version } = require("../../package.json") as { version: string };
    this.header(`Conductor v${version} Commands`);

    this.generic(chalk.bold.magenta("Commands:"));
    this.generic(chalk.white("  upload     ") + chalk.gray("CSV → PostgreSQL → Elasticsearch"));
    this.generic(chalk.white("  upload-es  ") + chalk.gray("CSV → Elasticsearch only"));
    this.generic(chalk.white("  upload-db  ") + chalk.gray("CSV → PostgreSQL only"));
    this.generic(chalk.white("  index-db   ") + chalk.gray("PostgreSQL → Elasticsearch"));
    this.generic("");

    this.generic(chalk.bold.magenta("Usage:"));
    this.generic(chalk.white("  conductor upload    -f data.csv -t <table> -i <index>"));
    this.generic(chalk.white("  conductor upload-es -f data.csv -i <index>"));
    this.generic(chalk.white("  conductor upload-db -f data.csv -t <table>"));
    this.generic(chalk.white("  conductor index-db  -t <table> -i <index>"));
    this.generic("");

    this.generic(chalk.bold.magenta("Flags:"));
    this.generic(chalk.gray("  -f, --file <paths...>        CSV files to process"));
    this.generic(chalk.gray("  -t, --table <name>           PostgreSQL table name"));
    this.generic(chalk.gray("  -i, --index <name>           Elasticsearch index name"));
    this.generic(chalk.gray("  -b, --batch-size <n>         Records per batch (default: 5000)"));
    this.generic(chalk.gray("  --delimiter <char>           CSV delimiter (default: ,)"));
    this.generic("");

    this.generic(chalk.bold.magenta("Connection defaults:"));
    this.generic(chalk.gray("  --db-host    localhost:5435   --db-name  overtureDb"));
    this.generic(chalk.gray("  --db-user    admin            --db-pass  admin123"));
    this.generic(chalk.gray("  --es-host    localhost:9200   --es-user  elastic"));
    this.generic("");
  }
}
