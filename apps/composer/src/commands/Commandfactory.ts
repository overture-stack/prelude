import type { Profile } from "../types";
import { Profiles } from "../types";
import { Command } from "./baseCommand";
import { ComposerError, ErrorCodes } from "../utils/errors";

// Import individual commands
import { SongCommand } from "./songCommand";
import { DictionaryCommand } from "./lecternCommand";
import { MappingCommand } from "./mappingCommands";
import { ArrangerCommand } from "./arrangerCommand";

export class CommandFactory {
  static createCommand(profile: Profile): Command {
    switch (profile) {
      case Profiles.GENERATE_SONG_SCHEMA:
        return new SongCommand();

      case Profiles.GENERATE_LECTERN_DICTIONARY:
        return new DictionaryCommand();

      case Profiles.GENERATE_ELASTICSEARCH_MAPPING:
        return new MappingCommand();

      case Profiles.GENERATE_ARRANGER_CONFIGS:
        return new ArrangerCommand();

      default:
        throw new ComposerError(
          `Unknown profile: ${profile}`,
          ErrorCodes.INVALID_ARGS
        );
    }
  }
}
