import { CLIOutput } from "../types";
import { ComposerError, ErrorCodes, handleError } from "../utils/errors";
import { Logger } from "../utils/logger";
import * as fs from "fs";
import { validateFile, validateDelimiter } from "../validations/fileValidator";

export abstract class Command {
  constructor(protected name: string) {}

  async run(cliOutput: CLIOutput): Promise<void> {
    try {
      // Add this at the start of run
      if (cliOutput.debug) {
        Logger.enableDebug();
        Logger.debug(`Running ${this.name} command with debug enabled`);
      }

      // Validate input before execution
      await this.validate(cliOutput);
      Logger.header(`Generating ${this.name} Configurations\n`);

      // Execute the specific command
      await this.execute(cliOutput);
    } catch (error) {
      handleError(error);
    }
  }

  protected abstract execute(cliOutput: CLIOutput): Promise<void>;

  protected async validate(cliOutput: CLIOutput): Promise<void> {
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

    // Validate each input file
    for (const filePath of cliOutput.filePaths) {
      await validateFile(filePath);
    }

    // Validate delimiter if provided
    if (cliOutput.delimiter) {
      validateDelimiter(cliOutput.delimiter);
    }
  }

  protected createDirectoryIfNotExists(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      Logger.success(`Created directory: ${dirPath}`);
    }
  }
}
