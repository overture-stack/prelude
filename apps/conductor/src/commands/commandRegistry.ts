// src/commands/commandRegistry.ts
/**
 * Updated command registry with unified upload command
 * Updated to include the new upload command that combines PostgreSQL and Elasticsearch functionality
 */

import { Command } from "./baseCommand";
import { Logger } from "../utils/logger";
import { ErrorFactory } from "../utils/errors";

// Import all command classes
import { UnifiedUploadCommand } from "./uploadCommand";
import { UploadCommand } from "./elasticsearchUploadCommand";
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

type CommandConstructor = new () => Command;

interface CommandInfo {
  name: string;
  description: string;
  category: string;
  constructor: CommandConstructor;
}

/**
 * Registry of all available commands with metadata
 * Updated with unified upload command
 */
export class CommandRegistry {
  private static commands = new Map<string, CommandInfo>([
    // New unified upload command
    [
      "upload",
      {
        name: "upload",
        description: "Upload data to PostgreSQL and/or Elasticsearch",
        category: "Data Upload",
        constructor: UnifiedUploadCommand,
      },
    ],
    // Keep existing specialized commands for backward compatibility
    [
      "esupload",
      {
        name: "esUpload",
        description: "Upload CSV data to Elasticsearch (specialized)",
        category: "Data Upload",
        constructor: UploadCommand,
      },
    ],
    [
      "postgresupload",
      {
        name: "postgresUpload",
        description: "Upload CSV data to PostgreSQL (specialized)",
        category: "Data Upload",
        constructor: PostgresUploadCommand,
      },
    ],
    [
      "index",
      {
        name: "index",
        description: "Index data from PostgreSQL table to Elasticsearch",
        category: "Data Processing",
        constructor: IndexCommand,
      },
    ],
    [
      "lecternupload",
      {
        name: "lecternUpload",
        description: "Upload schema to Lectern server",
        category: "Schema Management",
        constructor: LecternUploadCommand,
      },
    ],
    [
      "lyricregister",
      {
        name: "lyricRegister",
        description: "Register dictionary with Lyric service",
        category: "Dictionary Management",
        constructor: LyricRegistrationCommand,
      },
    ],
    [
      "lyricupload",
      {
        name: "lyricUpload",
        description: "Upload data to Lyric service",
        category: "Data Upload",
        constructor: LyricUploadCommand,
      },
    ],
    [
      "maestroindex",
      {
        name: "maestroIndex",
        description: "Index repository using Maestro",
        category: "Repository Indexing",
        constructor: MaestroIndexCommand,
      },
    ],
    [
      "songuploadschema",
      {
        name: "songUploadSchema",
        description: "Upload schema to SONG server",
        category: "Schema Management",
        constructor: SongUploadSchemaCommand,
      },
    ],
    [
      "songcreatestudy",
      {
        name: "songCreateStudy",
        description: "Create study in SONG server",
        category: "Study Management",
        constructor: SongCreateStudyCommand,
      },
    ],
    [
      "songsubmitanalysis",
      {
        name: "songSubmitAnalysis",
        description: "Submit analysis to SONG server",
        category: "Analysis Management",
        constructor: SongSubmitAnalysisCommand,
      },
    ],
    [
      "songpublishanalysis",
      {
        name: "songPublishAnalysis",
        description: "Publish analysis in SONG server",
        category: "Analysis Management",
        constructor: SongPublishAnalysisCommand,
      },
    ],
  ]);

  /**
   * Creates a command instance based on the profile name (case-insensitive)
   * @param profile - The command profile to create
   * @returns Command instance
   * @throws ConductorError if command not found
   */
  static createCommand(profile: string): Command {
    const normalizedProfile = profile.toLowerCase();
    const commandInfo = this.commands.get(normalizedProfile);

    if (!commandInfo) {
      throw ErrorFactory.args(`Unknown command: ${profile}`, [
        "Use 'conductor --help' to see available commands",
        "Check the command spelling",
        "Commands are case-insensitive",
        "Available commands: " + Array.from(this.commands.keys()).join(", "),
      ]);
    }

    return new commandInfo.constructor();
  }

  /**
   * Displays help information for all available commands
   */
  static displayHelp(): void {
    const categories = this.groupCommandsByCategory();

    for (const [category, commands] of categories.entries()) {
      Logger.generic(`\n${category}:`);
      commands.forEach((cmd) => {
        Logger.generic(`  ${cmd.name.padEnd(20)} ${cmd.description}`);
      });
    }

    Logger.generic("\nFor detailed command help:");
    Logger.generic("  conductor <command> --help");
  }

  /**
   * Groups commands by category for organized help display
   */
  private static groupCommandsByCategory(): Map<string, CommandInfo[]> {
    const categories = new Map<string, CommandInfo[]>();

    for (const command of this.commands.values()) {
      if (!categories.has(command.category)) {
        categories.set(command.category, []);
      }
      categories.get(command.category)!.push(command);
    }

    return categories;
  }

  /**
   * Gets all available command names
   */
  static getAvailableCommands(): string[] {
    return Array.from(this.commands.keys());
  }
}
