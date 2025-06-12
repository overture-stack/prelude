// src/commands/CommandRegistry.ts
/**
 * Simplified command registry to replace the complex factory pattern
 * Much cleaner than the current commandFactory.ts approach
 */

import { Command } from "./baseCommand";
import { Logger } from "../utils/logger";

// Import all command classes
import { UploadCommand } from "./uploadCsvCommand";
import { LecternUploadCommand } from "./lecternUploadCommand";
import { LyricRegistrationCommand } from "./lyricRegistrationCommand";
import { LyricUploadCommand } from "./lyricUploadCommand";
import { SongUploadSchemaCommand } from "./songUploadSchemaCommand";
import { SongCreateStudyCommand } from "./songCreateStudyCommand";
import { SongSubmitAnalysisCommand } from "./songSubmitAnalysisCommand";
import { SongPublishAnalysisCommand } from "./songPublishAnalysisCommand";
import { MaestroIndexCommand } from "./maestroIndexCommand";

// Only export what's actually needed externally
type CommandConstructor = new () => Command;

interface CommandInfo {
  name: string;
  description: string;
  category: string;
  constructor: CommandConstructor;
}

/**
 * Registry of all available commands with metadata
 */
export class CommandRegistry {
  private static commands = new Map<string, CommandInfo>([
    [
      "upload",
      {
        name: "upload",
        description: "Upload CSV data to Elasticsearch",
        category: "Data Upload",
        constructor: UploadCommand,
      },
    ],
    [
      "lecternUpload",
      {
        name: "lecternUpload",
        description: "Upload schema to Lectern server",
        category: "Schema Management",
        constructor: LecternUploadCommand,
      },
    ],
    [
      "lyricRegister",
      {
        name: "lyricRegister",
        description: "Register a dictionary with Lyric service",
        category: "Data Management",
        constructor: LyricRegistrationCommand,
      },
    ],
    [
      "lyricUpload",
      {
        name: "lyricUpload",
        description: "Upload data to Lyric service",
        category: "Data Upload",
        constructor: LyricUploadCommand,
      },
    ],
    [
      "songUploadSchema",
      {
        name: "songUploadSchema",
        description: "Upload schema to SONG server",
        category: "Schema Management",
        constructor: SongUploadSchemaCommand,
      },
    ],
    [
      "songCreateStudy",
      {
        name: "songCreateStudy",
        description: "Create study in SONG server",
        category: "Study Management",
        constructor: SongCreateStudyCommand,
      },
    ],
    [
      "songSubmitAnalysis",
      {
        name: "songSubmitAnalysis",
        description: "Submit analysis to SONG and upload files to Score",
        category: "Analysis Management",
        constructor: SongSubmitAnalysisCommand,
      },
    ],
    [
      "songPublishAnalysis",
      {
        name: "songPublishAnalysis",
        description: "Publish analysis in SONG server",
        category: "Analysis Management",
        constructor: SongPublishAnalysisCommand,
      },
    ],
    [
      "maestroIndex",
      {
        name: "maestroIndex",
        description: "Index data using Maestro",
        category: "Data Indexing",
        constructor: MaestroIndexCommand,
      },
    ],
  ]);

  /**
   * Create a command instance by name
   */
  static createCommand(commandName: string): Command {
    const commandInfo = this.commands.get(commandName);

    if (!commandInfo) {
      const availableCommands = Array.from(this.commands.keys()).join(", ");
      throw new Error(
        `Unknown command: ${commandName}. Available commands: ${availableCommands}`
      );
    }

    Logger.debug(`Creating command: ${commandInfo.name}`);
    return new commandInfo.constructor();
  }

  /**
   * Check if a command exists
   */
  static hasCommand(commandName: string): boolean {
    return this.commands.has(commandName);
  }

  /**
   * Get all available command names
   */
  static getCommandNames(): string[] {
    return Array.from(this.commands.keys());
  }

  /**
   * Get command information
   */
  static getCommandInfo(commandName: string): CommandInfo | undefined {
    return this.commands.get(commandName);
  }

  /**
   * Get all commands grouped by category
   */
  static getCommandsByCategory(): Map<string, CommandInfo[]> {
    const categories = new Map<string, CommandInfo[]>();

    for (const commandInfo of this.commands.values()) {
      const existing = categories.get(commandInfo.category) || [];
      existing.push(commandInfo);
      categories.set(commandInfo.category, existing);
    }

    return categories;
  }

  /**
   * Display help information for all commands
   */
  static displayHelp(): void {
    Logger.header("Available Commands");

    const categories = this.getCommandsByCategory();

    for (const [category, commands] of categories) {
      Logger.section(category);
      for (const command of commands) {
        Logger.commandInfo(command.name, command.description);
      }
      Logger.generic("");
    }
  }

  /**
   * Display help for a specific command
   */
  static displayCommandHelp(commandName: string): void {
    const commandInfo = this.getCommandInfo(commandName);

    if (!commandInfo) {
      Logger.error(`Unknown command: ${commandName}`);
      this.displayHelp();
      return;
    }

    Logger.header(`Command: ${commandInfo.name}`);
    Logger.info(commandInfo.description);
    Logger.info(`Category: ${commandInfo.category}`);

    // You could extend this to show command-specific options
    Logger.tip(
      `Use 'conductor ${commandName} --help' for command-specific options`
    );
  }

  /**
   * Register a new command (useful for plugins or extensions)
   */
  static registerCommand(
    name: string,
    description: string,
    category: string,
    constructor: CommandConstructor
  ): void {
    if (this.commands.has(name)) {
      Logger.warn(`Command '${name}' is already registered. Overwriting.`);
    }

    this.commands.set(name, {
      name,
      description,
      category,
      constructor,
    });

    Logger.debug(`Registered command: ${name}`);
  }

  /**
   * Unregister a command
   */
  static unregisterCommand(name: string): boolean {
    return this.commands.delete(name);
  }
}
