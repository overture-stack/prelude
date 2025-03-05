/**
 * Command Factory Module
 *
 * This module implements the Factory Pattern to create command instances based on the provided profile.
 * It serves as the central registry for all available commands in the Conductor service and
 * decouples command selection from command execution.
 *
 * The factory pattern allows for:
 * 1. Dynamic command creation based on runtime configuration
 * 2. Centralized command registration
 * 3. Easy addition of new commands without modifying existing code (Open/Closed Principle)
 * 4. Validation of profiles and helpful error messages
 *
 * Related files:
 * - baseCommand.ts: Defines the abstract Command class and interface
 * - types/cli.ts: Contains CLI argument interfaces and type definitions
 * - types/constants.ts: Defines available profiles as constants
 * - Individual command implementations (uploadCommand.ts, indexManagementCommand.ts, etc.)
 */

import type { Profile } from "../types";
import { Profiles } from "../types/constants";
import { Command } from "./baseCommand";
import { ConductorError, ErrorCodes, handleError } from "../utils/errors";
import { Logger } from "../utils/logger";

// Import individual commands
import { UploadCommand } from "./uploadCommand";
import { IndexManagementCommand } from "./indexManagementCommand";
import { LecternUploadCommand } from "./lecternUploadCommand";
import { LyricRegistrationCommand } from "./lyricRegistrationCommand";
import { LyricUploadCommand } from "./lyricUploadCommand";
import { SongUploadSchemaCommand } from "./songUploadSchemaCommand";
import { SongCreateStudyCommand } from "./songCreateStudyCommand";
import { SongSubmitAnalysisCommand } from "./songSubmitAnalysisCommand";
import { ScoreManifestUploadCommand } from "./scoreManifestUploadCommand";
import { SongPublishAnalysisCommand } from "./songPublishAnalysisCommand";

/**
 * Type definition for command class constructors.
 * This type allows for both command classes that implement the Command interface
 * and those that extend the abstract Command class.
 */
type CommandConstructor = new () =>
  | Command
  | { run(cliOutput: any): Promise<any> };

/**
 * Maps each profile to its corresponding command constructor.
 * Used for type-checking the PROFILE_TO_COMMAND mapping.
 */
type CommandMap = {
  [K in Profile]: CommandConstructor;
};

/**
 * Maps profile identifiers to user-friendly display names.
 * Used for logging and error messages to improve user experience.
 */
const PROFILE_DISPLAY_NAMES: Record<string, string> = {
  [Profiles.UPLOAD]: "CSV Upload",
  [Profiles.INDEX_MANAGEMENT]: "Elasticsearch Indices Management",
  [Profiles.LECTERN_UPLOAD]: "Lectern Schema Upload",
  [Profiles.LYRIC_REGISTER]: "Lyric Dictionary Registration",
  [Profiles.LYRIC_DATA]: "Lyric Data Loading",
  [Profiles.song_upload_schema]: "SONG Schema Upload",
  [Profiles.song_create_study]: "SONG Study Creation",
  [Profiles.song_submit_analysis]: "SONG Analysis Submission",
  [Profiles.score_manifest_upload]: "Score Manifest Upload",
  [Profiles.song_publish_analysis]: "SONG Analysis Publication",
};

/**
 * Maps profile identifiers to their corresponding command classes.
 * This is the core registry of available commands in the system.
 *
 * When adding a new command:
 * 1. Create the command class extending the base Command class
 * 2. Import it at the top of this file
 * 3. Add the profile to the Profiles enum in types/constants.ts
 * 4. Add an entry to this mapping
 * 5. Add a display name to PROFILE_DISPLAY_NAMES
 */
const PROFILE_TO_COMMAND: Partial<CommandMap> = {
  [Profiles.UPLOAD]: UploadCommand,
  [Profiles.INDEX_MANAGEMENT]: IndexManagementCommand,
  [Profiles.LECTERN_UPLOAD]: LecternUploadCommand,
  [Profiles.LYRIC_REGISTER]: LyricRegistrationCommand,
  [Profiles.LYRIC_DATA]: LyricUploadCommand,
  [Profiles.song_upload_schema]: SongUploadSchemaCommand,
  [Profiles.song_create_study]: SongCreateStudyCommand,
  [Profiles.song_submit_analysis]: SongSubmitAnalysisCommand,
  [Profiles.score_manifest_upload]: ScoreManifestUploadCommand,
  [Profiles.song_publish_analysis]: SongPublishAnalysisCommand,
} as const;

/**
 * Factory class responsible for creating command instances based on the requested profile.
 *
 * The factory pattern encapsulates the logic of selecting and instantiating the appropriate
 * command, providing a clean interface for the CLI entry point.
 */
export class CommandFactory {
  /**
   * Creates a command instance based on the specified profile.
   *
   * @param profile - The profile identifier from the CLI arguments
   * @returns An instance of the appropriate Command implementation
   * @throws ConductorError if the profile is not supported
   *
   * Usage:
   * ```
   * const command = CommandFactory.createCommand(cliOutput.profile);
   * await command.run(cliOutput);
   * ```
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
