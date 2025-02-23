import chalk from "chalk";

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  SUCCESS = 2,
  WARN = 3,
  ERROR = 4,
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
      [LogLevel.DEBUG]: "\n🔍",
      [LogLevel.INFO]: "\n▸",
      [LogLevel.SUCCESS]: "\n✓",
      [LogLevel.WARN]: "\n⚠",
      [LogLevel.ERROR]: "\n✗",
    };

    const colors = {
      [LogLevel.DEBUG]: chalk.bold.gray,
      [LogLevel.INFO]: chalk.bold.cyan,
      [LogLevel.SUCCESS]: chalk.bold.green,
      [LogLevel.WARN]: chalk.bold.yellow,
      [LogLevel.ERROR]: chalk.bold.red,
    };

    const levelLabels = {
      [LogLevel.DEBUG]: "Debug",
      [LogLevel.INFO]: "Info",
      [LogLevel.SUCCESS]: "Success",
      [LogLevel.WARN]: "Warn",
      [LogLevel.ERROR]: "Error",
    };

    return `${colors[level](
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

  static debug(message: string): void {
    if (this.config.debug) {
      console.log(this.formatMessage(message, LogLevel.DEBUG));
    }
  }

  static info(message: string): void {
    if (this.config.level <= LogLevel.INFO) {
      console.log(this.formatMessage(message, LogLevel.INFO));
    }
  }

  static success(message: string): void {
    if (this.config.level <= LogLevel.SUCCESS) {
      console.log(this.formatMessage(message, LogLevel.SUCCESS));
    }
  }

  static warn(message: string): void {
    if (this.config.level <= LogLevel.WARN) {
      console.warn(this.formatMessage(message, LogLevel.WARN));
    }
  }

  static error(message: string): void {
    if (this.config.level <= LogLevel.ERROR) {
      console.error(this.formatMessage(message, LogLevel.ERROR));
    }
  }

  static header(text: string): void {
    console.log(`\n${chalk.bold(text)}`);
  }

  static debugObject(label: string, obj: any): void {
    if (this.config.debug) {
      console.log(chalk.gray(`🔍 ${label}:`));
      Object.entries(obj).forEach(([key, value]) => {
        console.log(chalk.gray(`  ${key}:`), value || "Not set");
      });
    }
  }

  static initialize(): void {
    if (process.env.DEBUG === "true") {
      this.enableDebug();
    }
  }
}
