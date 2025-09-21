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

  static showReferenceCommands(): void {
    this.header("Conductor Upload Commands");

    // Upload commands only
    this.generic(chalk.bold.magenta("CSV Data Upload:"));
    this.generic(chalk.white("conductor upload -f data.csv -i index-name"));
    this.generic(chalk.gray("Options:"));
    this.generic(
      chalk.gray("-f, --file <paths...>  CSV files to upload (required)")
    );
    this.generic(
      chalk.gray("-i, --index <name>      Target Elasticsearch index (required)")
    );
    this.generic(
      chalk.gray("-u, --url <url>         Elasticsearch URL")
    );
    this.generic(
      chalk.gray("--user <username>       Elasticsearch username")
    );
    this.generic(
      chalk.gray("--password <password>   Elasticsearch password")
    );
    this.generic(
      chalk.gray("-b, --batch-size <n>    Batch size (default: 1000)")
    );
    this.generic(
      chalk.gray("--delimiter <char>      CSV delimiter (default: ,)")
    );
    this.generic("");
    this.generic(
      chalk.gray("Example: conductor upload -f data.csv -i my-index --url http://localhost:9200")
    );
    this.generic("");

    // Elasticsearch Connection Info
    this.generic(chalk.bold.magenta("Connection Information:"));
    this.generic(chalk.gray("Default Elasticsearch URL: http://localhost:9200"));
    this.generic(chalk.gray("Default credentials: elastic / myelasticpassword"));
    this.generic(chalk.gray("Default index pattern: <filename>-index"));
    this.generic("");
  }
}
