/**
 * Command Factory
 *
 * Creates appropriate command instances based on the CLI profile.
 * Follows the Factory Method pattern.
 */

import { Command } from "./baseCommand";
import { UploadCommand } from "./uploadCommand";
import { ConductorError, ErrorCodes } from "../utils/errors";
import { CLIprofile } from "../cli";

export class CommandFactory {
  /**
   * Create a command instance based on the given profile
   * @param profile The CLI operation profile
   * @returns A command instance
   */
  static createCommand(profile: CLIprofile): Command {
    switch (profile) {
      case "upload":
        return new UploadCommand();
      default:
        throw new ConductorError(
          `Unsupported command profile: ${profile}`,
          ErrorCodes.INVALID_ARGS
        );
    }
  }
}
