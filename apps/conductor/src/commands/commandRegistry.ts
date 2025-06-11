// src/commands/CommandRegistry.ts - Enhanced with ErrorFactory patterns
/**
 * Simplified command registry to replace the complex factory pattern
 * Much cleaner than the current commandFactory.ts approach
 * Enhanced with ErrorFactory for consistent error handling
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
 * Enhanced with ErrorFactory for better error handling
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
   * Enhanced with ErrorFactory for better error messages
   */
  static createCommand(commandName: string): Command {
    if (!commandName || typeof commandName !== "string") {
      throw ErrorFactory.args("Command name is required", undefined, [
        "Provide a valid command name",
        "Use 'conductor --help' to see available commands",
        "Check command spelling and syntax",
      ]);
    }

    const commandInfo = this.commands.get(commandName);

    if (!commandInfo) {
      const availableCommands = Array.from(this.commands.keys()).join(", ");
      const similarCommands = this.findSimilarCommands(commandName);

      const suggestions = [
        `Available commands: ${availableCommands}`,
        "Use 'conductor --help' for command documentation",
        "Check command spelling and syntax",
      ];

      if (similarCommands.length > 0) {
        suggestions.unshift(`Did you mean: ${similarCommands.join(", ")}?`);
      }

      throw ErrorFactory.args(
        `Unknown command: ${commandName}`,
        commandName,
        suggestions
      );
    }

    try {
      Logger.debugString(`Creating command: ${commandInfo.name}`);
      return new commandInfo.constructor();
    } catch (error) {
      throw ErrorFactory.validation(
        `Failed to create command '${commandName}'`,
        {
          commandName,
          error: error instanceof Error ? error.message : String(error),
        },
        [
          "Command may have initialization issues",
          "Check system requirements and dependencies",
          "Try restarting the application",
          "Contact support if the problem persists",
        ]
      );
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

    Logger.generic("For detailed command help:");
    Logger.generic("  conductor <command> --help");
    Logger.generic("");
    Logger.generic("For general options:");
    Logger.generic("  conductor --help");
  }

  /**
   * Display help for a specific command
   * Enhanced with ErrorFactory for unknown commands
   */
  static displayCommandHelp(commandName: string): void {
    if (!commandName) {
      throw ErrorFactory.args("Command name required for help", undefined, [
        "Specify a command to get help for",
        "Example: conductor upload --help",
        "Use 'conductor --help' for general help",
      ]);
    }

    const commandInfo = this.getCommandInfo(commandName);

    if (!commandInfo) {
      const availableCommands = this.getCommandNames().join(", ");
      const similarCommands = this.findSimilarCommands(commandName);

      const suggestions = [
        `Available commands: ${availableCommands}`,
        "Use 'conductor --help' for all commands",
        "Check command spelling",
      ];

      if (similarCommands.length > 0) {
        suggestions.unshift(`Did you mean: ${similarCommands.join(", ")}?`);
      }

      throw ErrorFactory.args(
        `Unknown command: ${commandName}`,
        commandName,
        suggestions
      );
    }

    Logger.header(`Command: ${commandInfo.name}`);
    Logger.info`${commandInfo.description}`;
    Logger.info`Category: ${commandInfo.category}`;

    // You could extend this to show command-specific options
    Logger.tipString(
      `Use 'conductor ${commandName} --help' for command-specific options`
    );
  }

  /**
   * Register a new command (useful for plugins or extensions)
   * Enhanced with validation
   */
  static registerCommand(
    name: string,
    description: string,
    category: string,
    constructor: CommandConstructor
  ): void {
    if (!name || typeof name !== "string") {
      throw ErrorFactory.args(
        "Valid command name required for registration",
        undefined,
        [
          "Provide a non-empty string as command name",
          "Use lowercase names with hyphens for consistency",
          "Example: 'my-custom-command'",
        ]
      );
    }

    if (!description || typeof description !== "string") {
      throw ErrorFactory.args(
        "Command description required for registration",
        undefined,
        [
          "Provide a descriptive string for the command",
          "Describe what the command does briefly",
          "Example: 'Upload data to custom service'",
        ]
      );
    }

    if (!category || typeof category !== "string") {
      throw ErrorFactory.args(
        "Command category required for registration",
        undefined,
        [
          "Provide a category for organizing commands",
          "Use existing categories or create meaningful new ones",
          "Examples: 'Data Upload', 'Schema Management'",
        ]
      );
    }

    if (!constructor || typeof constructor !== "function") {
      throw ErrorFactory.validation(
        "Valid command constructor required for registration",
        { name, constructor: typeof constructor },
        [
          "Provide a class constructor that extends Command",
          "Ensure the constructor is properly imported",
          "Check that the command class is valid",
        ]
      );
    }

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

    Logger.debugString(`Registered command: ${name}`);
  }

  /**
   * Unregister a command
   */
  static unregisterCommand(name: string): boolean {
    if (!name || typeof name !== "string") {
      throw ErrorFactory.args(
        "Valid command name required for unregistration",
        undefined,
        [
          "Provide the name of the command to unregister",
          "Check the command name spelling",
          "Use getCommandNames() to see registered commands",
        ]
      );
    }

    const wasRemoved = this.commands.delete(name);

    if (wasRemoved) {
      Logger.debugString(`Unregistered command: ${name}`);
    } else {
      Logger.warnString(
        `Command '${name}' was not registered, nothing to unregister`
      );
    }

    return wasRemoved;
  }

  /**
   * Enhanced command validation
   */
  static validateCommandName(commandName: string): boolean {
    if (!commandName || typeof commandName !== "string") {
      return false;
    }

    // Check for valid command name format
    if (!/^[a-zA-Z][a-zA-Z0-9-]*$/.test(commandName)) {
      return false;
    }

    return true;
  }

  /**
   * Find commands with similar names (for typo suggestions)
   */
  private static findSimilarCommands(commandName: string): string[] {
    const allCommands = this.getCommandNames();
    const similar: string[] = [];

    for (const command of allCommands) {
      // Simple similarity check - starts with same letters or contains the input
      if (
        command.toLowerCase().startsWith(commandName.toLowerCase()) ||
        command.toLowerCase().includes(commandName.toLowerCase()) ||
        commandName.toLowerCase().includes(command.toLowerCase())
      ) {
        similar.push(command);
      }
    }

    return similar.slice(0, 3); // Return max 3 suggestions
  }

  /**
   * Get command statistics
   */
  static getStats(): {
    totalCommands: number;
    categoryCounts: Record<string, number>;
    commandsByCategory: Map<string, CommandInfo[]>;
  } {
    const categories = this.getCommandsByCategory();
    const categoryCounts: Record<string, number> = {};

    for (const [category, commands] of categories) {
      categoryCounts[category] = commands.length;
    }

    return {
      totalCommands: this.commands.size,
      categoryCounts,
      commandsByCategory: categories,
    };
  }

  /**
   * Validate all registered commands (useful for testing)
   */
  static validateAllCommands(): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    for (const [name, info] of this.commands) {
      try {
        // Basic validation
        if (!this.validateCommandName(name)) {
          errors.push(`Invalid command name format: ${name}`);
        }

        if (!info.description || info.description.trim().length === 0) {
          errors.push(`Command '${name}' missing description`);
        }

        if (!info.category || info.category.trim().length === 0) {
          errors.push(`Command '${name}' missing category`);
        }

        // Try to instantiate (this might catch constructor issues)
        const instance = new info.constructor();
        if (!(instance instanceof Command)) {
          errors.push(`Command '${name}' constructor does not extend Command`);
        }
      } catch (error) {
        errors.push(
          `Command '${name}' validation failed: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
