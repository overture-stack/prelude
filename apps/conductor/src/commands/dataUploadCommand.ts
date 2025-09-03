// src/commands/dataUploadCommand.ts
/**
 * Base class for all data upload commands
 * Handles common validation and file processing patterns
 * FIXED: Correct import paths for your structure
 */

import { Command, CommandResult } from "./baseCommand";
import { CLIOutput } from "../types/cli";
import { Logger } from "../utils/logger";
import { ErrorFactory } from "../utils/errors";
import { validateFiles } from "../validations/fileValidator";
import { validateDelimiter } from "../validations/utils";
import { FileProcessor } from "../services/fileProcessor";

export abstract class DataUploadCommand extends Command {
  private fileProcessor = new FileProcessor();

  constructor(name: string) {
    super(name);
  }

  protected async execute(cliOutput: CLIOutput): Promise<CommandResult> {
    return await this.fileProcessor.processFiles(
      cliOutput.filePaths,
      (filePath: string) => this.processFile(filePath, cliOutput.config)
    );
  }

  protected async validate(cliOutput: CLIOutput): Promise<void> {
    await super.validate(cliOutput);
    await this.validateCommon(cliOutput);
    await this.validateSpecific(cliOutput);
  }

  private async validateCommon(cliOutput: CLIOutput): Promise<void> {
    const { config, filePaths } = cliOutput;

    // Validate files
    const fileValidation = await validateFiles(filePaths);
    if (!fileValidation.valid) {
      throw ErrorFactory.invalidFile(
        `File validation failed: ${fileValidation.errors.join("; ")}`,
        undefined,
        fileValidation.errors.concat([
          "Check file extensions (.csv, .tsv allowed)",
          "Verify files exist and are accessible",
        ])
      );
    }

    // Validate delimiter
    try {
      validateDelimiter(config.delimiter);
    } catch (error) {
      throw ErrorFactory.validation(
        "Invalid delimiter specified",
        { delimiter: config.delimiter },
        [
          "Delimiter must be a single character",
          "Common delimiters: , (comma), ; (semicolon), \\t (tab)",
        ]
      );
    }

    // Validate batch size
    this.validateBatchSize(config.batchSize);
  }

  private validateBatchSize(batchSize: number): void {
    if (!batchSize || isNaN(batchSize) || batchSize <= 0) {
      throw ErrorFactory.validation(
        "Batch size must be a positive number",
        { provided: batchSize },
        [
          "Provide a positive number for batch size",
          "Recommended range: 100-5000",
          "Example: --batch-size 1000",
        ]
      );
    }

    if (batchSize > 10000) {
      Logger.warnString(
        `Batch size ${batchSize} is large and may cause performance issues`
      );
      Logger.tipString("Consider using 1000-5000 for better performance");
    }
  }

  // Abstract methods that subclasses must implement
  protected abstract validateSpecific(cliOutput: CLIOutput): Promise<void>;
  protected abstract processFile(filePath: string, config: any): Promise<void>;

  protected requiresInputFiles(): boolean {
    return true;
  }
}
