// src/commands/CommandRegistry.ts
/**
 * Simplified command registry to replace the complex factory pattern
 * Updated to use error factory pattern for consistent error handling
 * Updated with case-insensitive command handling and esUpload rename
 */

import { Command } from "./baseCommand";
import { Logger } from "../utils/logger";
import { ErrorFactory } from "../utils/errors";

// Import all command classes
import { UploadCommand } from "./uploadCsvCommand";
import { PostgresUploadCommand } from "./postgresUploadCommand";
import { IndexCommand } from "./postgresIndexCommand";
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
 * Updated with case-insensitive lookup and esUpload rename
 */
export class CommandRegistry {
  private static commands = new Map<string, CommandInfo>([
    // Store commands with lowercase keys for case-insensitive lookup
    [
      "esupload", // Changed from "upload" to "esupload"
      {
        name: "esUpload", // Display name
        description: "Upload CSV data to Elasticsearch",
        category: "Data Upload",
        constructor: UploadCommand,
      },
    ],
    [
      "postgresupload", // lowercase key
      {
        name: "postgresUpload", // original name for display
        description: "Upload CSV data to PostgreSQL database",
        category: "Data Upload",
        constructor: PostgresUploadCommand,
      },
    ],
    [
      "index", // lowercase key
      {
        name: "index", // original name for display
        description: "Index data from PostgreSQL table to Elasticsearch",
        category: "Data Integration",
        constructor: IndexCommand,
      },
    ],
    [
      "lecternupload", // lowercase key
      {
        name: "lecternUpload", // original name for display
        description: "Upload schema to Lectern server",
        category: "Schema Management",
        constructor: LecternUploadCommand,
      },
    ],
    [
      "lyricregister", // lowercase key
      {
        name: "lyricRegister", // original name for display
        description: "Register a dictionary with Lyric service",
        category: "Data Management",
        constructor: LyricRegistrationCommand,
      },
    ],
    [
      "lyricupload", // lowercase key
      {
        name: "lyricUpload", // original name for display
        description: "Upload data to Lyric service",
        category: "Data Upload",
        constructor: LyricUploadCommand,
      },
    ],
    [
      "songuploadschema", // lowercase key
      {
        name: "songUploadSchema", // original name for display
        description: "Upload schema to SONG server",
        category: "Schema Management",
        constructor: SongUploadSchemaCommand,
      },
    ],
    [
      "songcreatestudy", // lowercase key
      {
        name: "songCreateStudy", // original name for display
        description: "Create study in SONG server",
        category: "Study Management",
        constructor: SongCreateStudyCommand,
      },
    ],
    [
      "songsubmitanalysis", // lowercase key
      {
        name: "songSubmitAnalysis", // original name for display
        description: "Submit analysis to SONG and upload files to Score",
        category: "Analysis Management",
        constructor: SongSubmitAnalysisCommand,
      },
    ],
    [
      "songpublishanalysis", // lowercase key
      {
        name: "songPublishAnalysis", // original name for display
        description: "Publish analysis in SONG server",
        category: "Analysis Management",
        constructor: SongPublishAnalysisCommand,
      },
    ],
    [
      "maestroindex", // lowercase key
      {
        name: "maestroIndex", // original name for display
        description: "Index data using Maestro",
        category: "Data Indexing",
        constructor: MaestroIndexCommand,
      },
    ],
  ]);

  /**
   * Create a command instance by name (case-insensitive)
   */
  static createCommand(commandName: string): Command {
    // Convert to lowercase for case-insensitive lookup
    const normalizedCommandName = commandName.toLowerCase();
    const commandInfo = this.commands.get(normalizedCommandName);

    if (!commandInfo) {
      const availableCommands = Array.from(this.commands.values())
        .map((info) => info.name) // Use display names in error message
        .join(", ");

      throw ErrorFactory.args(`Unknown command: ${commandName}`, [
        `Available commands: ${availableCommands}`,
        "Use 'conductor --help' to see all available commands",
        "Check the command spelling and try again",
        "Commands are case-insensitive",
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
   * Check if a command exists (case-insensitive)
   */
  static hasCommand(commandName: string): boolean {
    return this.commands.has(commandName.toLowerCase());
  }

  /**
   * Get all available command names (returns display names)
   */
  static getCommandNames(): string[] {
    return Array.from(this.commands.values()).map((info) => info.name);
  }

  /**
   * Get command information (case-insensitive lookup)
   */
  static getCommandInfo(commandName: string): CommandInfo | undefined {
    return this.commands.get(commandName.toLowerCase());
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
      Logger.suggestion(category);
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
      `Use 'conductor ${commandInfo.name} --help' for command-specific options`
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
    const normalizedName = name.toLowerCase();
    if (this.commands.has(normalizedName)) {
      Logger.warnString(
        `Command '${name}' is already registered. Overwriting.`
      );
    }

    this.commands.set(normalizedName, {
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
    return this.commands.delete(name.toLowerCase());
  }

  /**
   * Validate that all registered commands are properly configured
   */
  static validateRegistry(): void {
    const issues: string[] = [];

    for (const [normalizedName, info] of this.commands) {
      if (!info.name || info.name.toLowerCase() !== normalizedName) {
        issues.push(`Command '${normalizedName}' has mismatched name property`);
      }

      if (!info.description) {
        issues.push(`Command '${normalizedName}' is missing description`);
      }

      if (!info.category) {
        issues.push(`Command '${normalizedName}' is missing category`);
      }

      if (!info.constructor) {
        issues.push(`Command '${normalizedName}' is missing constructor`);
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
