import chalk from "chalk";

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  SUCCESS = 2,
  WARN = 3,
  ERROR = 4,
  HELP = 5,
  GENERIC = 6,
  SECTION = 7,
  INPUT = 8,
}

interface LoggerConfig {
  level: LogLevel;
  debug: boolean;
}

export class Logger {
  private static config: LoggerConfig = {
    level: LogLevel.INFO,
    debug: false,
  };

  private static formatMessage(message: string, level: LogLevel): string {
    const icons = {
      [LogLevel.DEBUG]: "🔍",
      [LogLevel.INFO]: "▸",
      [LogLevel.SUCCESS]: "✓",
      [LogLevel.WARN]: "⚠",
      [LogLevel.ERROR]: "✗",
      [LogLevel.HELP]: "💡",
      [LogLevel.GENERIC]: "",
      [LogLevel.SECTION]: "",
      [LogLevel.INPUT]: "❔",
    };

    const colors: Record<LogLevel, (text: string) => string> = {
      [LogLevel.DEBUG]: chalk.bold.gray,
      [LogLevel.INFO]: chalk.bold.cyan,
      [LogLevel.SUCCESS]: chalk.bold.green,
      [LogLevel.WARN]: chalk.bold.yellow,
      [LogLevel.ERROR]: chalk.bold.red,
      [LogLevel.HELP]: chalk.bold.yellow,
      [LogLevel.GENERIC]: chalk.white,
      [LogLevel.SECTION]: chalk.bold.blue,
      [LogLevel.INPUT]: chalk.bold.yellow,
    };

    const levelLabels = {
      [LogLevel.DEBUG]: "Debug",
      [LogLevel.INFO]: "Info",
      [LogLevel.SUCCESS]: "Success",
      [LogLevel.WARN]: "Warn",
      [LogLevel.ERROR]: "Error",
      [LogLevel.HELP]: "Help",
      [LogLevel.GENERIC]: "",
      [LogLevel.SECTION]: "",
      [LogLevel.INPUT]: "User Input",
    };

    const needsNewLine = [
      LogLevel.ERROR,
      LogLevel.INPUT,
      LogLevel.WARN,
      LogLevel.SUCCESS,
    ].includes(level);

    const prefix = needsNewLine ? "\n" : "";

    if (level === LogLevel.GENERIC) {
      return colors[level](message);
    }

    if (level === LogLevel.SECTION) {
      return `${prefix}${colors[level](`${icons[level]} ${message}`)}`;
    }

    return `${prefix}${colors[level](
      `${icons[level]} ${levelLabels[level]} `
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
   * Tagged template helper that automatically bolds interpolated values.
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
   * Core log function that accepts either a tagged template literal or a plain string.
   */
  private static log(
    level: LogLevel,
    strings: TemplateStringsArray | string,
    ...values: any[]
  ): void {
    if (this.config.level > level && level !== LogLevel.DEBUG) return;
    if (!this.config.debug && level === LogLevel.DEBUG) return;

    const message =
      typeof strings === "string"
        ? strings
        : this.formatVariables(strings, ...values);

    const formattedMessage = this.formatMessage(message, level);

    if (level === LogLevel.WARN) {
      console.warn(formattedMessage);
    } else if (level === LogLevel.ERROR) {
      console.error(formattedMessage);
    } else {
      console.log(formattedMessage);
    }
  }

  static debug(strings: TemplateStringsArray | string, ...values: any[]): void {
    this.log(LogLevel.DEBUG, strings, ...values);
  }

  static info(strings: TemplateStringsArray | string, ...values: any[]): void {
    this.log(LogLevel.INFO, strings, ...values);
  }

  static success(
    strings: TemplateStringsArray | string,
    ...values: any[]
  ): void {
    this.log(LogLevel.SUCCESS, strings, ...values);
  }

  static warn(strings: TemplateStringsArray | string, ...values: any[]): void {
    this.log(LogLevel.WARN, strings, ...values);
  }

  static error(strings: TemplateStringsArray | string, ...values: any[]): void {
    this.log(LogLevel.ERROR, strings, ...values);
  }

  static help(strings: TemplateStringsArray | string, ...values: any[]): void {
    this.log(LogLevel.HELP, strings, ...values);
  }

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

  static timing(label: string, timeMs: number): void {
    const formattedTime =
      timeMs < 1000
        ? `${timeMs.toFixed(1)}ms`
        : `${(timeMs / 1000).toFixed(2)}s`;

    console.log(chalk.gray`⏱ ${label}: ${formattedTime}`);
  }

  static fileList(title: string, files: string[]): void {
    if (files.length === 0) return;
    Logger.warn`${title}:\n`;
    files.forEach((file) => {
      console.log(chalk.gray`  - ${file}`);
    });
  }

  static showReferenceCommands(): void {
    this.header("Example Commands");

    const commands = [
      {
        title: "Generate Elasticsearch Mapping",
        command: "composer -p generateElasticearchMapping ...",
      },
      {
        title: "Generate Arranger Configs",
        command: "composer -p generateArrangerConfigs ...",
      },
      {
        title: "Generate Song Schema",
        command: "composer -p generateSongSchema ...",
      },
      {
        title: "Generate Lectern Dictionary",
        command: "composer -p generateLecternDictionary ...",
      },
      { title: "Debug Mode", command: "composer --debug [other-options]" },
    ];

    commands.forEach(({ title, command }) => {
      console.log(chalk.bold.cyan`${title}:`);
      console.log(chalk.white(command + "\n"));
    });
  }
}
