import type { Profile } from "../types";
import { Profiles } from "../types";
import { Command } from "./baseCommand";
import { ComposerError, ErrorCodes } from "../utils/errors";
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
      throw new ComposerError(
        `Unsupported profile: ${profile}`,
        ErrorCodes.INVALID_ARGS
      );
    }

    return new CommandClass();
  }
}
