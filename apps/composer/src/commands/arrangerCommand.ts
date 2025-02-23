import * as path from "path";
import * as fs from "fs";
import { Command } from "./baseCommand";
import { CLIOutput } from "../types";
import { ComposerError, ErrorCodes } from "../utils/errors";
import { generateArrangerConfigs } from "../services/generateArrangerConfigs";
import { Logger } from "../utils/logger";

/**
 * Command implementation for generating Arranger configurations
 * Takes an Elasticsearch mapping file as input and generates the required
 * configuration files for setting up Arranger
 */
export class ArrangerCommand extends Command {
  constructor() {
    super("Arranger");
    Logger.debug("ArrangerCommand instantiated");
  }

  /**
   * Validates the command input parameters
   * @param cliOutput The CLI output containing command parameters
   * @throws {ComposerError} If validation fails
   */
  protected async validate(cliOutput: CLIOutput): Promise<void> {
    Logger.debug("Starting ArrangerCommand validation");
    await super.validate(cliOutput);

    if (!cliOutput.outputPath) {
      Logger.debug("Output path validation failed");
      throw new ComposerError(
        "Output path is required",
        ErrorCodes.INVALID_ARGS
      );
    }

    const validDocumentTypes = ["file", "analysis"];
    const documentType = cliOutput.arrangerConfig?.documentType;
    Logger.debug(`Validating document type: ${documentType}`);

    if (!documentType || !validDocumentTypes.includes(documentType)) {
      Logger.debug(`Invalid document type: ${documentType}`);
      throw new ComposerError(
        `Invalid document type. Must be one of: ${validDocumentTypes.join(
          ", "
        )}`,
        ErrorCodes.INVALID_ARGS
      );
    }

    const filePath = cliOutput.filePaths[0];
    const fileExtension = path.extname(filePath).toLowerCase();
    Logger.debug(`Validating file extension: ${fileExtension}`);

    if (fileExtension !== ".json") {
      Logger.debug("File extension validation failed - not JSON");
      throw new ComposerError(
        "Arranger configs require a JSON mapping file",
        ErrorCodes.INVALID_FILE
      );
    }

    if (!fs.existsSync(filePath)) {
      Logger.debug(`File not found at path: ${filePath}`);
      throw new ComposerError(
        `File not found: ${filePath}`,
        ErrorCodes.INVALID_FILE
      );
    }

    Logger.debug("ArrangerCommand validation completed successfully");
  }

  /**
   * Executes the command to generate Arranger configurations
   * @param cliOutput The CLI output containing command parameters
   * @returns The generated configurations
   * @throws {ComposerError} If generation fails
   */
  protected async execute(cliOutput: CLIOutput): Promise<any> {
    Logger.debug("Starting ArrangerCommand execution");
    const outputPath = cliOutput.outputPath!;
    const filePath = cliOutput.filePaths[0];

    try {
      Logger.info("Reading mapping file");
      Logger.debug(`Reading file from path: ${filePath}`);
      const mappingContent = fs.readFileSync(filePath, "utf-8");

      let mapping;
      try {
        Logger.debug("Parsing JSON mapping content");
        mapping = JSON.parse(mappingContent);
      } catch (error) {
        // Changed from passing error as second argument to including it in the message
        Logger.debug(`JSON parsing failed: ${error}`);
        throw new ComposerError(
          "Invalid JSON mapping file",
          ErrorCodes.INVALID_FILE
        );
      }

      Logger.debug("Generating Arranger configurations");
      const configs = generateArrangerConfigs(
        mapping,
        cliOutput.config.elasticsearch.index
      );

      Logger.debug("Configuration generation completed");
      Logger.success(`Configuration files saved to: ${outputPath}`);

      return configs;
    } catch (error) {
      // Changed from passing error as second argument to including it in the message
      Logger.debug(`Error during execution: ${error}`);
      if (error instanceof ComposerError) {
        Logger.error(error.message);
        throw error;
      }
      throw new ComposerError(
        "Failed to generate Arranger configurations",
        ErrorCodes.GENERATION_FAILED,
        error
      );
    }
  }
}
