/**
 * Command Interface
 *
 * Base interface for all command implementations.
 * Commands follow the Command Pattern for encapsulating operations.
 */

import { CLIOutput } from "../types/cli";

/**
 * Base Command interface that all command implementations must follow
 */
export interface Command {
  /**
   * Execute the command with the provided CLI output
   * @param cliOutput The parsed CLI arguments and configuration
   */
  run(cliOutput: CLIOutput): Promise<void>;
}

/**
 * Command execution result (for future extensions)
 */
export interface CommandResult {
  /** Whether the command succeeded */
  success: boolean;

  /** Optional error message if the command failed */
  errorMessage?: string;

  /** Optional error code if the command failed */
  errorCode?: string;

  /** Additional result details */
  details?: Record<string, any>;
}
