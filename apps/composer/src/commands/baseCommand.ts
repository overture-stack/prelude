import { CLIOutput } from "../types";
import { ComposerError, ErrorCodes, handleError } from "../utils/errors";
import { Logger } from "../utils/logger";
import * as fs from "fs";
import * as path from "path";
import { validateFile, validateDelimiter } from "../validations/fileValidator";
import * as readline from "readline";

export abstract class Command {
  protected defaultOutputPath: string;
  protected defaultOutputFileName: string = "output.json";

  constructor(protected name: string, defaultOutputPath?: string) {
    this.defaultOutputPath = defaultOutputPath || "configs";
  }

  async run(cliOutput: CLIOutput): Promise<void> {
    const startTime = Date.now();

    try {
      if (cliOutput.debug) {
        Logger.enableDebug();
        Logger.debug`Running ${this.name} command with debug enabled`;
      }

      await this.validate(cliOutput);

      Logger.debug`Output path before check: ${cliOutput.outputPath}`;

      let usingDefaultPath = false;

      if (!cliOutput.outputPath?.trim()) {
        Logger.debug("No output directory specified.");
        usingDefaultPath = true;
        cliOutput.outputPath = path.join(this.defaultOutputPath);
      }

      const isDefaultPath = this.isUsingDefaultPath(cliOutput);

      if (isDefaultPath || usingDefaultPath) {
        Logger.defaultValueInfo(
          `Using default output path: ${cliOutput.outputPath}`,
          "Use -o or --output <path> to specify a different location"
        );
      } else {
        Logger.info`Output directory set to: ${cliOutput.outputPath}`;
      }

      if (cliOutput.outputPath && cliOutput.force !== true) {
        const shouldContinue = await this.checkForExistingFiles(
          cliOutput.outputPath
        );
        if (!shouldContinue) {
          Logger.info("Operation cancelled by user.");
          return;
        }
      } else if (cliOutput.force === true) {
        Logger.debug("Force flag enabled, skipping overwrite confirmation");
      }

      Logger.header(`Generating ${this.name} Configurations`);

      await this.execute(cliOutput);
    } catch (error) {
      handleError(error);
    }
  }

  protected abstract execute(cliOutput: CLIOutput): Promise<void>;

  protected isUsingDefaultPath(cliOutput: CLIOutput): boolean {
    return (
      cliOutput.outputPath === this.defaultOutputPath ||
      cliOutput.outputPath ===
        path.join(this.defaultOutputPath, this.defaultOutputFileName)
    );
  }

  protected async validate(cliOutput: CLIOutput): Promise<void> {
    if (!cliOutput.filePaths?.length) {
      throw new ComposerError(
        "No input files provided",
        ErrorCodes.INVALID_ARGS
      );
    }

    for (const filePath of cliOutput.filePaths) {
      await validateFile(filePath);
    }

    if (cliOutput.delimiter) {
      validateDelimiter(cliOutput.delimiter);
    }
  }

  protected createDirectoryIfNotExists(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      Logger.info`Created directory: ${dirPath}`;
    }
  }

  protected async checkForExistingFiles(outputPath: string): Promise<boolean> {
    let directoryPath = outputPath;
    let outputFileName: string | undefined;

    if (path.extname(outputPath)) {
      Logger.debug`Output path appears to be a file: ${outputPath}`;
      directoryPath = path.dirname(outputPath);
      outputFileName = path.basename(outputPath);
      Logger.debug(
        `Using directory: ${directoryPath}, fileName: ${outputFileName}`
      );
    }

    this.createDirectoryIfNotExists(directoryPath);

    const existingEntries = fs.existsSync(directoryPath)
      ? fs.readdirSync(directoryPath)
      : [];

    // Filter existing files that would be overwritten
    const filesToOverwrite = existingEntries.filter((entry) => {
      const fullPath = path.join(directoryPath, entry);

      // If specific file name is given, only check that exact file
      if (outputFileName) {
        return entry === outputFileName && fs.statSync(fullPath).isFile();
      }

      // If no specific file name, check if entry is a file and would match generated output
      return (
        fs.statSync(fullPath).isFile() &&
        (entry.endsWith(".json") ||
          entry.startsWith(this.defaultOutputFileName.split(".")[0]))
      );
    });

    if (filesToOverwrite.length === 0) {
      return true;
    }

    Logger.fileList(
      "The following file(s) in the output directory will be overwritten",
      filesToOverwrite
    );

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    return new Promise((resolve) => {
      rl.question(
        Logger.input("Do you wish to continue? [y/n]: "),
        (answer) => {
          rl.close();
          resolve(answer.toLowerCase() === "y");
        }
      );
    });
  }

  protected logGeneratedFile(filePath: string): void {
    Logger.info`Generated file: ${filePath}`;
  }
}
