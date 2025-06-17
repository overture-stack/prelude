// src/commands/CommandRegistry.ts
/**
 * Simplified command registry to replace the complex factory pattern
 * Updated to use error factory pattern for consistent error handling
 */

import { Command } from "./baseCommand";
import { Logger } from "../utils/logger";
import { ErrorFactory } from "../utils/errors";

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
      throw ErrorFactory.args(`Unknown command: ${commandName}`, [
        `Available commands: ${availableCommands}`,
        "Use 'conductor --help' to see all available commands",
        "Check the command spelling and try again",
      ]);
    }

    Logger.debug`Creating command: ${commandInfo.name}`;

    try {
      return new commandInfo.constructor();
    } catch (error) {
      throw ErrorFactory.args(`Failed to create command: ${commandName}`, [
        "This appears to be an internal error",
        "Try running with --debug for more information",
        "Contact support if the issue persists",
      ]);
    }
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
      Logger.errorString(`Unknown command: ${commandName}`);
      this.displayHelp();
      return;
    }

    Logger.header(`Command: ${commandInfo.name}`);
    Logger.infoString(commandInfo.description);
    Logger.infoString(`Category: ${commandInfo.category}`);

    // You could extend this to show command-specific options
    Logger.tipString(
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
      Logger.warnString(
        `Command '${name}' is already registered. Overwriting.`
      );
    }

    this.commands.set(name, {
      name,
      description,
      category,
      constructor,
    });

    Logger.debug`Registered command: ${name}`;
  }

  /**
   * Unregister a command
   */
  static unregisterCommand(name: string): boolean {
    return this.commands.delete(name);
  }

  /**
   * Validate that all registered commands are properly configured
   */
  static validateRegistry(): void {
    const issues: string[] = [];

    for (const [name, info] of this.commands) {
      if (!info.name || info.name !== name) {
        issues.push(`Command '${name}' has mismatched name property`);
      }

      if (!info.description) {
        issues.push(`Command '${name}' is missing description`);
      }

      if (!info.category) {
        issues.push(`Command '${name}' is missing category`);
      }

      if (!info.constructor) {
        issues.push(`Command '${name}' is missing constructor`);
      }
    }

    if (issues.length > 0) {
      throw ErrorFactory.validation(
        "Command registry validation failed",
        { issues },
        [
          "Check command definitions in CommandRegistry",
          "Ensure all commands have required properties",
          "Fix the validation issues and try again",
        ]
      );
    }

    Logger.debug`Command registry validation passed (${this.commands.size} commands)`;
  }

  /**
   * Get registry statistics
   */
  static getStats(): {
    totalCommands: number;
    categoryCounts: Record<string, number>;
    categories: string[];
  } {
    const categories = this.getCommandsByCategory();
    const categoryCounts: Record<string, number> = {};

    for (const [category, commands] of categories) {
      categoryCounts[category] = commands.length;
    }

    return {
      totalCommands: this.commands.size,
      categoryCounts,
      categories: Array.from(categories.keys()),
    };
  }
}
