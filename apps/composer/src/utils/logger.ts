import chalk from "chalk";

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  SUCCESS = 2,
  WARN = 3,
  ERROR = 4,
  HELP = 5,
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
      [LogLevel.SUCCESS]: "\n✓",
      [LogLevel.WARN]: "⚠",
      [LogLevel.ERROR]: "\n✗",
      [LogLevel.HELP]: "\n💡",
    };

    const colors = {
      [LogLevel.DEBUG]: chalk.bold.gray,
      [LogLevel.INFO]: chalk.bold.cyan,
      [LogLevel.SUCCESS]: chalk.bold.green,
      [LogLevel.WARN]: chalk.bold.yellow,
      [LogLevel.ERROR]: chalk.bold.red,
      [LogLevel.HELP]: chalk.bold.yellow,
    };

    const levelLabels = {
      [LogLevel.DEBUG]: "Debug",
      [LogLevel.INFO]: "Info",
      [LogLevel.SUCCESS]: "Success",
      [LogLevel.WARN]: "Warn",
      [LogLevel.ERROR]: "Error",
      [LogLevel.HELP]: "Help\n",
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

  static help(message: string): void {
    console.log(this.formatMessage(message, LogLevel.HELP));
  }

  static header(text: string): void {
    console.log(`\n${chalk.bold.cyan(text)}`);
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
  static showReferenceCommands(): void {
    const commands = [
      {
        title: "Generate Elasticsearch Mapping (from JSON)",
        command:
          "composer -p generateElasticsearchMapping -f mapping.json -o es-config.json --index my-index --shards 3 --replicas 2",
      },
      {
        title: "Generate Elasticsearch Mapping (from CSV)",
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

    console.log(chalk.cyan.bold("\nExample Commands:\n"));

    commands.forEach(({ title, command }) => {
      console.log(chalk.bold.yellow(`\n${title}:`));
      console.log(chalk.gray(command));
    });

    console.log("\n");
  }
}
