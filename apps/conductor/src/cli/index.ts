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
import { Logger, LogLevel } from "../utils/logger";

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

    // Process profile
    const profile = "upload" as CLIprofile;
    const outputPath = options.output;

    // Log consolidated configuration
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

    // Validate files
    const fileValidation = await validateFiles(options.files);
    if (!fileValidation.valid) {
      throw createValidationError(
        `File validation failed: ${fileValidation.errors.join("; ")}`,
        { validationErrors: fileValidation.errors }
      );
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
      Logger.error`${error.message}`;
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
