import { CLIOutput } from "../types";
import { ComposerError, ErrorCodes, handleError } from "../utils/errors";
import chalk from "chalk";

export abstract class Command {
  constructor(protected name: string) {}

  async run(cliOutput: CLIOutput): Promise<void> {
    try {
      // Print a header
      console.log(`\n--- ${this.name} Command ---`);

      // Validate input before execution
      this.validate(cliOutput);

      // Execute the specific command
      await this.execute(cliOutput);

      // Print success messsage
      console.log(
        chalk.green(`\n✓ ${this.name} command completed successfully`)
      );
    } catch (error) {
      handleError(error);
    }
  }

  // Each specific command must implement this method
  protected abstract execute(cliOutput: CLIOutput): Promise<void>;

  // Basic validation checks
  protected validate(cliOutput: CLIOutput): void {
    if (!cliOutput.filePaths || cliOutput.filePaths.length === 0) {
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

  // Utility method to create directory if it doesn't exist
  protected createDirectoryIfNotExists(dirPath: string): void {
    const fs = require("fs");
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(`Created directory: ${dirPath}`);
    }
  }
}
