import * as path from "path";
import * as fs from "fs";
import { Command } from "./baseCommand";
import { CLIOutput } from "../types";
import { ComposerError, ErrorCodes } from "../utils/errors";
import { generateArrangerConfigs } from "../services/generateArrangerConfigs";
import { Logger } from "../utils/logger";
import { CONFIG_PATHS } from "../utils/paths";

/**
 * Command implementation for generating Arranger configurations
 * Takes an Elasticsearch mapping file as input and generates the required
 * configuration files for setting up Arranger
 */
export class ArrangerCommand extends Command {
  // Define arranger-specific defaults
  protected readonly defaultOutputFileName = "configs";

  constructor() {
    super("Arranger", CONFIG_PATHS.arranger.dir);
    // Override the default filename from the base class
    this.defaultOutputFileName = "configs";
  }

  /**
   * Override isUsingDefaultPath to handle arranger-specific defaults
   */
  protected isUsingDefaultPath(cliOutput: CLIOutput): boolean {
    return (
      cliOutput.outputPath === CONFIG_PATHS.arranger.configs ||
      cliOutput.outputPath ===
        path.join(CONFIG_PATHS.arranger.dir, "configs") ||
      super.isUsingDefaultPath(cliOutput)
    );
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

    // Ensure only one mapping file is provided
    if (cliOutput.filePaths.length !== 1) {
      Logger.debug(
        `Invalid number of mapping files: ${cliOutput.filePaths.length}`
      );
      throw new ComposerError(
        "You must provide exactly one mapping file",
        ErrorCodes.INVALID_ARGS
      );
    }

    const validDocumentTypes = ["file", "analysis"];
    const documentType = cliOutput.arrangerConfig?.documentType;
    Logger.debug`Validating document type: ${documentType}`;

    if (!documentType || !validDocumentTypes.includes(documentType)) {
      Logger.debug`Invalid document type: ${documentType}`;
      throw new ComposerError(
        `Invalid document type. Must be one of: ${validDocumentTypes.join(
          ", "
        )}`,
        ErrorCodes.INVALID_ARGS
      );
    }

    // Warn if using default document type ("file")
    if (documentType === "file") {
      Logger.defaultValueInfo(
        `Using default Arranger document type: "file"`,
        "Use --arranger-doc-type <type> to specify a different document type (file or analysis)."
      );
    }

    const filePath = cliOutput.filePaths[0];
    const fileExtension = path.extname(filePath).toLowerCase();
    Logger.debug`Validating file extension: ${fileExtension}`;

    if (fileExtension !== ".json") {
      Logger.debug("File extension validation failed - not JSON");
      throw new ComposerError(
        "Arranger configs require a JSON mapping file",
        ErrorCodes.INVALID_FILE
      );
    }

    if (!fs.existsSync(filePath)) {
      Logger.debug`File not found at path: ${filePath}`;
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
    let outputPath = cliOutput.outputPath!;

    // Normalize output path for arranger config files
    if (fs.existsSync(outputPath) && fs.statSync(outputPath).isDirectory()) {
      outputPath = path.join(outputPath, this.defaultOutputFileName);
      Logger.debug(
        `Output is a directory, will create ${this.defaultOutputFileName} inside it`
      );
    }

    const filePath = cliOutput.filePaths[0];

    try {
      Logger.info("Reading mapping file");
      Logger.debug`Reading file from path: ${filePath}`;
      const mappingContent = fs.readFileSync(filePath, "utf-8");

      let mapping;
      try {
        Logger.debug("Parsing JSON mapping content");
        mapping = JSON.parse(mappingContent);
      } catch (error) {
        Logger.debug`JSON parsing failed: ${error}`;
        throw new ComposerError(
          "Invalid JSON mapping file",
          ErrorCodes.INVALID_FILE
        );
      }

      // Ensure output directory exists
      const outputDir = path.dirname(outputPath);
      this.createDirectoryIfNotExists(outputDir);

      Logger.debug("Generating Arranger configurations");
      const configs = generateArrangerConfigs(
        mapping,
        cliOutput.config.elasticsearch?.index
      );

      // Write each configuration to a separate file
      const baseFilePath = path.join(outputDir, "base.json");
      const extendedFilePath = path.join(outputDir, "extended.json");
      const tableFilePath = path.join(outputDir, "table.json");
      const facetsFilePath = path.join(outputDir, "facets.json");

      fs.writeFileSync(baseFilePath, JSON.stringify(configs.base, null, 2));
      fs.writeFileSync(
        extendedFilePath,
        JSON.stringify(configs.extended, null, 2)
      );
      fs.writeFileSync(tableFilePath, JSON.stringify(configs.table, null, 2));
      fs.writeFileSync(facetsFilePath, JSON.stringify(configs.facets, null, 2));

      Logger.debug("Configuration generation completed");
      Logger.success`Configuration files saved to:`;
      Logger.generic(`    - ${baseFilePath}`);
      Logger.generic(`    - ${extendedFilePath}`);
      Logger.generic(`    - ${tableFilePath}`);
      Logger.generic(`    - ${facetsFilePath}`);

      return configs;
    } catch (error) {
      Logger.debug`Error during execution: ${error}`;
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
