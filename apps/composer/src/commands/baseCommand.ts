import { CLIOutput } from "../types";
import { ComposerError, ErrorCodes, handleError } from "../utils/errors";
import { Logger } from "../utils/logger";
import * as fs from "fs";

export abstract class Command {
  constructor(protected name: string) {}

  async run(cliOutput: CLIOutput): Promise<void> {
    try {
      // Validate input before execution
      this.validate(cliOutput);

      // Display command header
      Logger.header(`${this.name}`);

      // Execute the specific command
      await this.execute(cliOutput);

      // Print success message
      Logger.success(`${this.name} command completed successfully`);
    } catch (error) {
      handleError(error);
    }
  }

  protected abstract execute(cliOutput: CLIOutput): Promise<void>;

  protected validate(cliOutput: CLIOutput): void {
    if (!cliOutput.filePaths?.length) {
      throw new ComposerError(
        "No input files provided",
        ErrorCodes.INVALID_ARGS
      );
    }

    if (!cliOutput.outputPath) {
      throw new ComposerError(
        "No output path specified",
        ErrorCodes.INVALID_ARGS
      );
    }
  }

  protected createDirectoryIfNotExists(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      Logger.success(`Created directory: ${dirPath}`);
    }
  }
}
