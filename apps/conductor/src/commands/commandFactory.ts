/**
 * Command Factory
 *
 * Creates appropriate command instances based on the CLI mode.
 * Follows the Factory Method pattern.
 */

import { Command } from "./baseCommand";
import { UploadCommand } from "./uploadCommand";
import { ConductorError, ErrorCodes } from "../utils/errors";
import { CLIMode } from "../cli";

export class CommandFactory {
  /**
   * Create a command instance based on the given mode
   * @param mode The CLI operation mode
   * @returns A command instance
   */
  static createCommand(mode: CLIMode): Command {
    switch (mode) {
      case "upload":
        return new UploadCommand();
      default:
        throw new ConductorError(
          `Unsupported command mode: ${mode}`,
          ErrorCodes.INVALID_ARGS
        );
    }
  }
}
