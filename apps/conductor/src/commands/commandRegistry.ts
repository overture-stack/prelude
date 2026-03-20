// src/commands/CommandRegistry.ts
import { Command } from "./baseCommand";
import { Logger } from "../utils/logger";
import { ErrorFactory } from "../utils/errors";

import { ElasticUploadCommand } from "./elasticUploadCommand";
import { PostgresUploadCommand } from "./postgresUploadCommand";
import { PostgresIndexCommand } from "./postgresIndexCommand";
import { PostgresFullPipelineCommand } from "./postgresFullPipelineCommand";

type CommandConstructor = new () => Command;

interface CommandInfo {
  name: string;
  description: string;
  category: string;
  constructor: CommandConstructor;
}

export class CommandRegistry {
  private static commands = new Map<string, CommandInfo>([
    [
      "upload",
      {
        name: "upload",
        description: "Complete workflow: CSV → PostgreSQL → Elasticsearch",
        category: "Data Pipeline",
        constructor: PostgresFullPipelineCommand,
      },
    ],
    [
      "upload-es",
      {
        name: "upload-es",
        description: "Upload CSV data directly to Elasticsearch",
        category: "Data Upload",
        constructor: ElasticUploadCommand,
      },
    ],
    [
      "upload-db",
      {
        name: "upload-db",
        description: "Upload CSV data to PostgreSQL database",
        category: "Data Upload",
        constructor: PostgresUploadCommand,
      },
    ],
    [
      "index-db",
      {
        name: "index-db",
        description: "Index PostgreSQL table data to Elasticsearch",
        category: "Data Indexing",
        constructor: PostgresIndexCommand,
      },
    ],
  ]);

  static createCommand(commandName: string): Command {
    const commandInfo = this.commands.get(commandName);

    if (!commandInfo) {
      const availableCommands = Array.from(this.commands.keys()).join(", ");
      throw ErrorFactory.args(`Unknown command: ${commandName}`, [
        `Available commands: ${availableCommands}`,
        "Use 'conductor --help' to see all available commands",
        "Check the command spelling and try again",
      ]);
    }

    Logger.debug`Creating command: ${commandInfo.name}`;

    try {
      return new commandInfo.constructor();
    } catch {
      throw ErrorFactory.args(`Failed to create command: ${commandName}`, [
        "This appears to be an internal error",
        "Try running with --debug for more information",
      ]);
    }
  }

  static hasCommand(commandName: string): boolean {
    return this.commands.has(commandName);
  }

  static getCommandNames(): string[] {
    return Array.from(this.commands.keys());
  }

  static displayHelp(): void {
    Logger.header("Available Commands");

    const categories = new Map<string, CommandInfo[]>();
    for (const commandInfo of this.commands.values()) {
      const existing = categories.get(commandInfo.category) || [];
      existing.push(commandInfo);
      categories.set(commandInfo.category, existing);
    }

    for (const [category, commands] of categories) {
      Logger.suggestion(category);
      for (const command of commands) {
        Logger.commandInfo(command.name, command.description);
      }
      Logger.generic("");
    }
  }
}
