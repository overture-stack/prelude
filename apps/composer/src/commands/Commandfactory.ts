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
      const availableProfiles = Object.keys(PROFILE_TO_COMMAND)
        .map((profile) => `  ${profile}`)
        .join("\n");

      const error = new ComposerError(
        `Unsupported profile: ${profile}`,
        ErrorCodes.INVALID_ARGS
      );

      handleError(error, () => {
        Logger.info(`Available profiles:\n\n${availableProfiles}\n`);
        Logger.showReferenceCommands();
      });
    }

    const command = new CommandClass();
    Logger.debug(`Created ${profile} command instance`);
    return command;
  }
}
