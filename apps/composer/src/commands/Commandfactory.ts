import type { Profile } from "../types";
import { Profiles } from "../types";
import { Command } from "./baseCommand";
import { ComposerError, ErrorCodes, handleError } from "../utils/errors";
import { Logger } from "../utils/logger";

// Import individual commands
import { SongCommand } from "./songCommand";
import { DictionaryCommand } from "./lecternCommand";
import { MappingCommand } from "./mappingCommands";
import { ArrangerCommand } from "./arrangerCommand";

type CommandConstructor = new () => Command;

type CommandMap = {
  [K in Profile]: CommandConstructor;
};

// Map of profile names to user-friendly display names
const PROFILE_DISPLAY_NAMES: Record<string, string> = {
  [Profiles.GENERATE_SONG_SCHEMA]: "Song Schema Generator",
  [Profiles.GENERATE_LECTERN_DICTIONARY]: "Lectern Dictionary Generator",
  [Profiles.GENERATE_ELASTICSEARCH_MAPPING]: "Elasticsearch Mapping Generator",
  [Profiles.GENERATE_ARRANGER_CONFIGS]: "Arranger Configs Generator",
};

const PROFILE_TO_COMMAND: Partial<CommandMap> = {
  [Profiles.GENERATE_SONG_SCHEMA]: SongCommand,
  [Profiles.GENERATE_LECTERN_DICTIONARY]: DictionaryCommand,
  [Profiles.GENERATE_ELASTICSEARCH_MAPPING]: MappingCommand,
  [Profiles.GENERATE_ARRANGER_CONFIGS]: ArrangerCommand,
} as const;

export class CommandFactory {
  static createCommand(profile: Profile): Command {
    Logger.debug(`Creating command for profile: ${profile}`);
    const CommandClass = PROFILE_TO_COMMAND[profile];

    if (!CommandClass) {
      const error = new ComposerError(
        `Unsupported profile: ${profile}`,
        ErrorCodes.INVALID_ARGS
      );

      handleError(error, () => {
        // Use the new section method for better organization
        Logger.section("Available Profiles");

        // List all available profiles with descriptions
        Object.entries(PROFILE_TO_COMMAND).forEach(([profileName]) => {
          const displayName = PROFILE_DISPLAY_NAMES[profileName] || profileName;
          Logger.commandInfo(profileName, displayName);
        });

        // Show reference commands with improved formatting
        Logger.header("Example Commands");
        Logger.showReferenceCommands();
      });
    }

    const command = new CommandClass();
    const displayName = PROFILE_DISPLAY_NAMES[profile] || profile;

    Logger.debug(`Created ${displayName} command instance`);
    return command;
  }
}
