// In your CLI (cli/index.ts)
import { Command } from "commander";
import { Config } from "../types/config";
import {
  ConductorError,
  ErrorCodes,
  createValidationError,
} from "../utils/errors";
import { validateFiles } from "../validations/fileValidator";
import { validateEnvironment } from "../validations/environment";
import { loadEnvironmentConfig } from "./environment";
import { validateCliOptions } from "./validation";
import { configureCommandOptions } from "./options";
import { Logger } from "../utils/logger";

export type CLIprofile = "upload";

export interface CLIOutput {
  config: Config;
  filePaths: string[];
  profile: CLIprofile;
  outputPath?: string;
  envConfig: any;
}

export async function setupCLI(): Promise<CLIOutput> {
  const program = new Command();
  const startTime = process.hrtime();

  try {
    Logger.debug("Conductor CLI");

    // Load environment and parse options
    const envConfig = loadEnvironmentConfig();
    configureCommandOptions(program);
    program.parse();
    const options = program.opts();

    // Initialize logger based on debug flag
    if (options.debug) {
      Logger.enableDebug();
    } else {
      Logger.initialize();
    }

    // Process profile and output
    const profile = "upload" as CLIprofile;
    const outputPath = options.output;

    Logger.debugObject("CLI Configuration", {
      command: {
        profile,
        input: options.files,
        output: outputPath,
      },
      elasticsearch: {
        url: options.url || envConfig.elasticsearchUrl,
        index: options.index || envConfig.indexName,
      },
    });

    // Validate options and environment
    validateCliOptions(options);

    // Validate files and log details in validator style
    const fileValidation = await validateFiles(options.files);
    if (!fileValidation.valid) {
      fileValidation.errors.forEach((errorMsg) => {
        if (errorMsg.startsWith("Files not found:")) {
          const missingFiles = errorMsg
            .replace("Files not found:", "")
            .split(",")
            .map((s) => s.trim());
          Logger.error`Files not found: ${missingFiles.length} file(s)`;
          Logger.warnfileList("Missing files", missingFiles);
        } else if (errorMsg.startsWith("Invalid file extensions.")) {
          Logger.error`${errorMsg}`;
        } else {
          Logger.error`${errorMsg}`;
        }
      });
      // Throw error with a cleaner message by joining the errors directly
      throw createValidationError(fileValidation.errors.join("; "), {
        validationErrors: fileValidation.errors,
      });
    }

    // Validate environment
    await validateEnvironment({
      elasticsearchUrl: options.url || envConfig.elasticsearchUrl,
    });

    // Build CLI output
    const cliOutput: CLIOutput = {
      config: {
        elasticsearch: {
          url: options.url || envConfig.elasticsearchUrl,
          index: options.index || envConfig.indexName || "tabular-index",
          user: options.user || envConfig.esUser,
          password: options.password || envConfig.esPassword,
        },
        batchSize: parseInt(options.batchSize, 10) || 1000,
        delimiter: options.delimiter || ",",
      },
      profile,
      filePaths: options.files,
      outputPath,
      envConfig,
    };

    return cliOutput;
  } catch (error) {
    if (error instanceof ConductorError) {
      // The error has already been logged in the validation step, so simply rethrow it.
      throw error;
    }
    Logger.error`Unexpected error: ${
      error instanceof Error ? error.message : String(error)
    }`;
    throw new ConductorError(
      "Error setting up CLI",
      ErrorCodes.CLI_ERROR,
      error
    );
  }
}
