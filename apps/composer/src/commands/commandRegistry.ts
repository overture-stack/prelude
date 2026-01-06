// src/commands/commandRegistry.ts - Updated to support Lectern dictionaries
import { Command } from "./baseCommand";
import { Profile, Profiles } from "../types";
import { Logger } from "../utils/logger";
import { ErrorFactory } from "../utils/errors";

// Import command classes
import { SongCommand } from "./songCommand";
import { DictionaryCommand } from "./lecternCommand";
import { MappingCommand } from "./mappingCommands";
import { ArrangerCommand } from "./arrangerCommand";
import { PostgresCommand } from "./postgresCommand";

// Simplified command configuration
interface CommandConfig {
  name: string;
  description: string;
  fileTypes: string[];
  createCommand: () => Command;
}

/**
 * Simplified command registry with Lectern dictionary support for mapping generation
 */
export class CommandRegistry {
  private static readonly commands = new Map<Profile, CommandConfig>([
    [
      Profiles.GENERATE_SONG_SCHEMA,
      {
        name: "SongSchema",
        description: "Generate Song schema from JSON metadata",
        fileTypes: [".json"],
        createCommand: () => new SongCommand(),
      },
    ],
    [
      Profiles.GENERATE_LECTERN_DICTIONARY,
      {
        name: "LecternDictionary",
        description: "Generate Lectern dictionary from CSV files",
        fileTypes: [".csv"],
        createCommand: () => new DictionaryCommand(),
      },
    ],
    [
      Profiles.GENERATE_ELASTICSEARCH_MAPPING,
      {
        name: "ElasticsearchMapping",
        description:
          "Generate Elasticsearch mapping from CSV, JSON, or Lectern dictionary",
        fileTypes: [".csv", ".json"], // Note: Lectern dictionaries are JSON files
        createCommand: () => new MappingCommand(),
      },
    ],
    [
      Profiles.GENERATE_ARRANGER_CONFIGS,
      {
        name: "ArrangerConfigs",
        description: "Generate Arranger configs from Elasticsearch mapping",
        fileTypes: [".json"],
        createCommand: () => new ArrangerCommand(),
      },
    ],
    [
      Profiles.GENERATE_POSTGRES_TABLE,
      {
        name: "PostgresTable",
        description: "Generate PostgreSQL CREATE TABLE statement from CSV files",
        fileTypes: [".csv"],
        createCommand: () => new PostgresCommand(),
      },
    ],
  ]);

  /**
   * Create a command instance by profile
   */
  static createCommand(profile: Profile): Command {
    const config = this.commands.get(profile);
    if (!config) {
      throw ErrorFactory.args(`Unknown profile: ${profile}`, [
        "Available profiles:",
        ...Array.from(this.commands.entries()).map(
          ([p, c]) => `  ${p}: ${c.description}`
        ),
        "Use --help to see all available options",
      ]);
    }

    Logger.debug`Creating command: ${config.name}`;
    return config.createCommand();
  }

  /**
   * Create and execute a command in one step
   */
  static async execute(profile: Profile, cliOutput: any): Promise<void> {
    const command = this.createCommand(profile);
    await command.run(cliOutput);
  }

  /**
   * Check if a profile is supported
   */
  static isRegistered(profile: Profile): boolean {
    return this.commands.has(profile);
  }

  /**
   * Get all available profiles
   */
  static getAvailableProfiles(): Profile[] {
    return Array.from(this.commands.keys());
  }

  /**
   * Get command configuration by profile
   */
  static getConfig(profile: Profile): CommandConfig | undefined {
    return this.commands.get(profile);
  }

  /**
   * Validate file types for a given profile
   * Note: For ElasticsearchMapping, Lectern dictionaries are validated by content, not just extension
   */
  static validateFileTypes(
    profile: Profile,
    filePaths: string[]
  ): {
    valid: boolean;
    invalidFiles: string[];
    supportedTypes: string[];
  } {
    const config = this.commands.get(profile);
    if (!config) {
      return { valid: false, invalidFiles: filePaths, supportedTypes: [] };
    }

    const path = require("path");
    const invalidFiles = filePaths.filter((filePath) => {
      const ext = path.extname(filePath).toLowerCase();
      return !config.fileTypes.includes(ext);
    });

    return {
      valid: invalidFiles.length === 0,
      invalidFiles,
      supportedTypes: config.fileTypes,
    };
  }
}
