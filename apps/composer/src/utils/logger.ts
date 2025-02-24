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

    // Only add newlines for errors and warnings
    const needsNewLine = [
      LogLevel.ERROR,
      LogLevel.INPUT,
      LogLevel.WARN,
      LogLevel.SUCCESS,
    ].includes(level);

    const prefix = needsNewLine ? "\n" : "";

    // Special case for generic messages
    if (level === LogLevel.GENERIC) {
      return colors[level](message);
    }

    // Special case for section headers
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

  static help(message: string): void {
    console.log(this.formatMessage(message, LogLevel.HELP));
  }

  static generic(message: string): void {
    console.log(this.formatMessage(message, LogLevel.GENERIC));
  }

  static input(message: string): string {
    return this.formatMessage(message, LogLevel.INPUT);
  }

  /**
   * Creates a section header with a colored border and icon
   */
  static section(text: string): void {
    console.log(this.formatMessage(text, LogLevel.SECTION));
  }

  /**
   * Creates a major header with a full-width separator
   * Used for main processing stages
   */
  static header(text: string): void {
    const separator = "═".repeat(text.length + 6);
    console.log(`\n${chalk.bold.magenta(separator)}`);
    console.log(`${chalk.bold.magenta("  " + text + "  ")}`);
    console.log(`${chalk.bold.magenta(separator)}\n`);
  }

  /**
   * Outputs detailed information about a command or option
   */
  static commandInfo(command: string, description: string): void {
    console.log(`${chalk.bold.blue(command)}: ${description}`);
  }

  /**
   * Shows an info message with a hint about how to customize a default value
   */
  static defaultValueInfo(message: string, overrideCommand: string): void {
    if (this.config.level <= LogLevel.INFO) {
      console.log(this.formatMessage(message, LogLevel.INFO));
      console.log(chalk.gray(`\n` + `   Override with: ${overrideCommand}\n`));
    }
  }

  /**
   * Shows a warning about using a default value
   */
  static defaultValueWarning(message: string, overrideCommand: string): void {
    if (this.config.level <= LogLevel.WARN) {
      console.warn(this.formatMessage(message, LogLevel.WARN));
      console.log(chalk.gray(`\n` + `   Override with: ${overrideCommand}\n`));
    }
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

  /**
   * Displays a timing message for performance logging
   */
  static timing(label: string, timeMs: number): void {
    const formattedTime =
      timeMs < 1000
        ? `${timeMs.toFixed(1)}ms`
        : `${(timeMs / 1000).toFixed(2)}s`;

    console.log(chalk.gray(`⏱ ${label}: ${formattedTime}`));
  }

  /**
   * Shows a group of related files
   */
  static fileList(title: string, files: string[]): void {
    if (files.length === 0) return;

    Logger.warn(`${title}:\n`);
    files.forEach((file) => {
      console.log(chalk.gray(`  - ${file}`));
    });
  }

  static showReferenceCommands(): void {
    this.header("Example Commands");

    const commands = [
      {
        title: "Generate Elasticsearch Mapping (from JSON(s))",
        command:
          "composer -p generateElasticSearchMapping -f mapping.json -o es-config.json --index my-index --shards 3 --replicas 2",
      },
      {
        title: "Generate Elasticsearch Mapping (from CSV(s))",
        command:
          "composer -p generateElasticSearchMapping -f data.csv -o es-config.json --index my-index --delimiter ',' --shards 3 --replicas 2",
      },
      {
        title: "Generate Arranger Configs",
        command:
          "composer -p generateArrangerConfigs -f mapping.json -o configs/ --arranger-doc-type file",
      },
      {
        title: "Generate Song Schema",
        command:
          "composer -p generateSongSchema -f metadata.json -o schema.json --name 'My Schema' --file-types BAM FASTQ",
      },
      {
        title: "Generate Lectern Dictionary",
        command:
          "composer -p generateLecternDictionary -f data.csv -o dictionary.json -n 'My Dictionary' -v '1.0.0'",
      },
      {
        title: "Debug Mode",
        command: "composer --debug [other-options]",
      },
    ];

    commands.forEach(({ title, command }) => {
      console.log(chalk.bold.cyan(`${title}:`));
      console.log(chalk.white(command + "\n"));
    });
  }
}
