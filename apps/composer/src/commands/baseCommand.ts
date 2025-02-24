import { CLIOutput } from "../types";
import { ComposerError, ErrorCodes, handleError } from "../utils/errors";
import { Logger } from "../utils/logger";
import { Profiles } from "../types";
import * as fs from "fs";
import * as path from "path";
import { validateFile, validateDelimiter } from "../validations/fileValidator";
import * as readline from "readline";
import { CONFIG_PATHS } from "../utils/paths";

export abstract class Command {
  protected defaultOutputPath: string;
  protected defaultOutputFileName: string = "output.json";

  constructor(protected name: string, defaultOutputPath?: string) {
    this.defaultOutputPath = defaultOutputPath || "configs";
  }

  async run(cliOutput: CLIOutput): Promise<void> {
    const startTime = Date.now();

    try {
      // Add this at the start of run
      if (cliOutput.debug) {
        Logger.enableDebug();
        Logger.debug(`Running ${this.name} command with debug enabled`);
      }
      // Validate input before execution
      await this.validate(cliOutput);

      // Configuration section

      // Show output path information
      Logger.debug(`Output path before check: ${cliOutput.outputPath}`);

      // Use the default path if outputPath is undefined, null, or an empty string
      let usingDefaultPath = false;

      if (!cliOutput.outputPath?.trim()) {
        Logger.debug("No output directory specified.");
        usingDefaultPath = true;
        cliOutput.outputPath = path.join(this.defaultOutputPath);
      }

      // Let each command determine if it's using a default path
      const isDefaultPath = this.isUsingDefaultPath(cliOutput);

      if (isDefaultPath || usingDefaultPath) {
        Logger.defaultValueInfo(
          `Using default output path: ${path.dirname(cliOutput.outputPath)}`,
          "Use -o or --output <path> to specify a different location"
        );
      } else {
        // Only show this message if user explicitly provided a non-default path
        Logger.info(`Output directory set to: ${cliOutput.outputPath}`);
      }

      // Check if output directory exists and contains files that would be overwritten
      if (cliOutput.outputPath && cliOutput.force !== true) {
        // Determine if the path is a file or directory
        let directoryPath = cliOutput.outputPath;
        let targetFileName = this.defaultOutputFileName;

        // If path has an extension or ends with common extensions, it's likely a file path
        if (path.extname(cliOutput.outputPath)) {
          Logger.debug(
            `Output path appears to be a file: ${cliOutput.outputPath}`
          );
          directoryPath = path.dirname(cliOutput.outputPath);
          targetFileName = path.basename(cliOutput.outputPath);
          Logger.debug(
            `Using directory: ${directoryPath}, Target file: ${targetFileName}`
          );
        }

        // Create the directory if it doesn't exist
        this.createDirectoryIfNotExists(directoryPath);

        // Check if the specific target file exists
        const targetFilePath = path.join(directoryPath, targetFileName);

        if (fs.existsSync(targetFilePath)) {
          // Use the fileList method for better formatting
          Logger.fileList(
            "The following files in the output directory will be overwritten",
            [targetFileName]
          );

          // Prompt the user for confirmation
          const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
          });

          const shouldContinue = await new Promise<boolean>((resolve) => {
            rl.question(
              Logger.input(`Do you wish to continue? [y/n]: `),
              (answer) => {
                rl.close();
                const shouldContinue = answer.toLowerCase() === "y";
                resolve(shouldContinue);
              }
            );
          });

          if (!shouldContinue) {
            Logger.info("Operation cancelled by user.");
            return;
          }
        }
      } else if (cliOutput.force === true) {
        Logger.debug("Force flag enabled, skipping overwrite confirmation");
      }

      // Main processing section
      Logger.header(`Generating ${this.name} Configurations`);

      // Execute the specific command
      await this.execute(cliOutput);
    } catch (error) {
      handleError(error);
    }
  }

  protected abstract execute(cliOutput: CLIOutput): Promise<void>;

  /**
   * Override this method in derived classes to determine if a default path is being used
   */
  protected isUsingDefaultPath(cliOutput: CLIOutput): boolean {
    return (
      cliOutput.outputPath === this.defaultOutputPath ||
      cliOutput.outputPath ===
        path.join(this.defaultOutputPath, this.defaultOutputFileName)
    );
  }

  protected async validate(cliOutput: CLIOutput): Promise<void> {
    // Existing input file validation
    if (!cliOutput.filePaths?.length) {
      throw new ComposerError(
        "No input files provided",
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

    // Profile-specific validations
    switch (cliOutput.profile) {
      case Profiles.GENERATE_LECTERN_DICTIONARY:
        if (!cliOutput.dictionaryConfig?.name) {
          Logger.warn(
            "No dictionary name specified. A generic name will be used."
          );
        }
        break;

      case Profiles.GENERATE_ELASTICSEARCH_MAPPING:
        const { elasticsearch } = cliOutput.config;

        // Log shard configuration
        Logger.debug(
          `Elasticsearch shard configuration - Shards: ${elasticsearch.shards}, Replicas: ${elasticsearch.replicas}`
        );

        if (elasticsearch.shards < 1) {
          Logger.warn(
            `Invalid shard count: ${elasticsearch.shards}. Defaulting to 1.`
          );
          cliOutput.config.elasticsearch.shards = 1;
        }

        if (elasticsearch.replicas < 0) {
          Logger.warn(
            `Invalid replica count: ${elasticsearch.replicas}. Defaulting to 0.`
          );
          cliOutput.config.elasticsearch.replicas = 0;
        }
        break;

      case Profiles.GENERATE_ARRANGER_CONFIGS:
        if (
          cliOutput.arrangerConfig?.documentType &&
          !["file", "analysis"].includes(cliOutput.arrangerConfig.documentType)
        ) {
          Logger.warn(
            `Invalid Arranger document type: ${cliOutput.arrangerConfig.documentType}. Defaulting to 'file'.`
          );
          cliOutput.arrangerConfig.documentType = "file";
        }
        break;
    }
  }

  protected createDirectoryIfNotExists(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      Logger.info(`Created directory: ${dirPath}`);
    }
  }

  /**
   * Checks if the output directory contains files that may be overwritten
   * and prompts the user for confirmation if needed.
   *
   * @param outputPath Directory or file path where files will be written
   * @returns Promise<boolean> True if operation should continue, false if cancelled
   */
  protected async checkForExistingFiles(outputPath: string): Promise<boolean> {
    // Determine if the path is a file or directory
    let directoryPath = outputPath;

    // If path has an extension or ends with .json, it's likely a file path
    if (path.extname(outputPath)) {
      Logger.debug(`Output path appears to be a file: ${outputPath}`);
      directoryPath = path.dirname(outputPath);
      Logger.debug(`Using directory: ${directoryPath}`);
    }

    // Create the directory if it doesn't exist
    this.createDirectoryIfNotExists(directoryPath);

    // Check if the directory exists and has files
    const existingFiles = fs.existsSync(directoryPath)
      ? fs.readdirSync(directoryPath).filter((file) => {
          // Filter to show only regular files, not directories
          const filePath = path.join(directoryPath, file);
          return fs.statSync(filePath).isFile();
        })
      : [];

    if (existingFiles.length === 0) {
      // No existing files, so no overwrite concern
      return true;
    }

    // List the files that may be overwritten
    Logger.fileList(
      "The following files in the output directory will be affected",
      existingFiles
    );

    // Create readline interface for user input
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    // Prompt the user for confirmation
    return new Promise((resolve) => {
      rl.question("Do you wish to continue? [y/n]: ", (answer) => {
        rl.close();
        const shouldContinue = answer.toLowerCase() === "y";
        resolve(shouldContinue);
      });
    });
  }
}
