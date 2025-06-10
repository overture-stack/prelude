// src/commands/commandFactory.ts
/**
 * Command Factory Module - Updated to remove songScoreSubmitCommand
 *
 * This module implements the Factory Pattern to create command instances based on the provided profile.
 * Updated to use the refactored SONG/Score services and remove the combined songScoreSubmit command.
 */

import type { Profile } from "../types";
import { Profiles } from "../types/constants";
import { Command } from "./baseCommand";
import { ConductorError, ErrorCodes, handleError } from "../utils/errors";
import { Logger } from "../utils/logger";

// Import individual commands
import { UploadCommand } from "./uploadCsvCommand";
import { LecternUploadCommand } from "./lecternUploadCommand";
import { LyricRegistrationCommand } from "./lyricRegistrationCommand";
import { LyricUploadCommand } from "./lyricUploadCommand";
import { SongUploadSchemaCommand } from "./songUploadSchemaCommand";
import { SongCreateStudyCommand } from "./songCreateStudyCommand";
import { SongSubmitAnalysisCommand } from "./songSubmitAnalysisCommand"; // Now includes Score functionality
import { SongPublishAnalysisCommand } from "./songPublishAnalysisCommand";
import { MaestroIndexCommand } from "./maestroIndexCommand";
// Note: scoreManifestUploadCommand and songScoreSubmitCommand are removed

/**
 * Type definition for command class constructors.
 */
type CommandConstructor = new () =>
  | Command
  | { run(cliOutput: any): Promise<any> };

/**
 * Maps each profile to its corresponding command constructor.
 */
type CommandMap = {
  [K in Profile]: CommandConstructor;
};

/**
 * Maps profile identifiers to user-friendly display names.
 * Updated to reflect the combined functionality.
 */
const PROFILE_DISPLAY_NAMES: Record<string, string> = {
  [Profiles.UPLOAD]: "CSV Upload",
  [Profiles.LECTERN_UPLOAD]: "Lectern Schema Upload",
  [Profiles.LYRIC_REGISTER]: "Lyric Dictionary Registration",
  [Profiles.LYRIC_DATA]: "Lyric Data Loading",
  [Profiles.song_upload_schema]: "SONG Schema Upload",
  [Profiles.song_create_study]: "SONG Study Creation",
  [Profiles.song_submit_analysis]: "SONG Analysis Submission & File Upload", // Updated description
  [Profiles.song_publish_analysis]: "SONG Analysis Publication",
  [Profiles.INDEX_REPOSITORY]: "Repository Indexing",
};

/**
 * Maps profile identifiers to their corresponding command classes.
 * Updated to remove songScoreSubmit and scoreManifestUpload.
 */
const PROFILE_TO_COMMAND: Partial<CommandMap> = {
  [Profiles.UPLOAD]: UploadCommand,
  [Profiles.LECTERN_UPLOAD]: LecternUploadCommand,
  [Profiles.LYRIC_REGISTER]: LyricRegistrationCommand,
  [Profiles.LYRIC_DATA]: LyricUploadCommand,
  [Profiles.INDEX_REPOSITORY]: MaestroIndexCommand,
  [Profiles.song_upload_schema]: SongUploadSchemaCommand,
  [Profiles.song_create_study]: SongCreateStudyCommand,
  [Profiles.song_submit_analysis]: SongSubmitAnalysisCommand,
  [Profiles.song_publish_analysis]: SongPublishAnalysisCommand,
  // Note: score_manifest_upload and song_score_submit profiles are removed
} as const;

/**
 * Factory class responsible for creating command instances based on the requested profile.
 */
export class CommandFactory {
  /**
   * Creates a command instance based on the specified profile.
   *
   * @param profile - The profile identifier from the CLI arguments
   * @returns An instance of the appropriate Command implementation
   * @throws ConductorError if the profile is not supported
   */
  static createCommand(
    profile: Profile
  ): Command | { run(cliOutput: any): Promise<any> } {
    Logger.debug(`Creating command for profile: ${profile}`);
    const CommandClass = PROFILE_TO_COMMAND[profile];

    if (!CommandClass) {
      const error = new ConductorError(
        `Unsupported profile: ${profile}`,
        ErrorCodes.INVALID_ARGS
      );

      // Handle the error by showing available profiles and example commands
      handleError(error, () => {
        // Use the section method for better organization in the console output
        Logger.section("Available Profiles");

        // List all available profiles with their user-friendly display names
        Object.entries(PROFILE_TO_COMMAND).forEach(([profileName]) => {
          const displayName = PROFILE_DISPLAY_NAMES[profileName] || profileName;
          Logger.commandInfo(profileName, displayName);
        });

        // Show reference commands with improved formatting for user guidance
        Logger.header(`Example Commands`);
        Logger.showReferenceCommands();
      });

      // This will never be reached if handleError works as expected,
      // but we add it for type safety
      throw error;
    }

    // Instantiate the command and return it
    const command = new CommandClass();
    const displayName = PROFILE_DISPLAY_NAMES[profile] || profile;

    Logger.debug(`Created ${displayName} command instance`);
    return command;
  }
}
