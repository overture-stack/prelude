import * as path from "path";
import * as fs from "fs";
import { Command } from "./baseCommand";
import { CLIOutput } from "../types";
import { ComposerError, ErrorCodes } from "../utils/errors";
import { generateArrangerConfigs } from "../services/generateArrangerConfigs";
import { validateFile, validateEnvironment } from "../validations";
import { Profiles } from "../types";
import chalk from "chalk";

/**
 * Command for generating Arranger configurations from Elasticsearch mappings.
 * Handles file validation, configuration generation, and output management.
 */
export class ArrangerCommand extends Command {
  constructor() {
    super("Arranger Configs");
  }

  /**
   * Validates command inputs and file types.
   * Checks for:
   * - Required output path
   * - JSON file type
   * - File accessibility
   * - Valid Arranger document type
   */
  protected async validate(cliOutput: CLIOutput): Promise<void> {
    await super.validate(cliOutput);

    if (!cliOutput.outputPath) {
      throw new ComposerError(
        "Output path is required",
        ErrorCodes.INVALID_ARGS
      );
    }

    // Validate Arranger document type
    const validDocumentTypes = ["file", "analysis"];
    const documentType = cliOutput.arrangerConfig?.documentType;

    if (!documentType || !validDocumentTypes.includes(documentType)) {
      throw new ComposerError(
        `Invalid document type. Must be one of: ${validDocumentTypes.join(
          ", "
        )}`,
        ErrorCodes.INVALID_ARGS
      );
    }

    const filePath = cliOutput.filePaths[0];
    const fileExtension = path.extname(filePath).toLowerCase();

    if (fileExtension !== ".json") {
      throw new ComposerError(
        "Arranger configs require a JSON mapping file",
        ErrorCodes.INVALID_FILE
      );
    }

    // Validate file accessibility
    const fileValid = await validateFile(filePath);
    if (!fileValid) {
      throw new ComposerError(
        `Invalid file ${filePath}`,
        ErrorCodes.INVALID_FILE
      );
    }
  }

  /**
   * Executes the Arranger configuration generation process:
   * 1. Reads and validates the Elasticsearch mapping
   * 2. Generates Arranger configurations
   * 3. Saves configuration files to the specified output path
   */
  protected async execute(cliOutput: CLIOutput): Promise<any> {
    const outputPath = cliOutput.outputPath!;

    console.log(chalk.cyan("\nGenerating Arranger Configurations..."));

    try {
      // Validate environment and ensure output directory exists
      await validateEnvironment({
        profile: Profiles.GENERATE_ARRANGER_CONFIGS,
        outputPath: outputPath,
      });

      // Read and validate the mapping file
      const filePath = cliOutput.filePaths[0];
      const mappingContent = fs.readFileSync(filePath, "utf-8");
      let mapping;

      try {
        mapping = JSON.parse(mappingContent);
      } catch (error) {
        throw new ComposerError(
          "Invalid JSON mapping file",
          ErrorCodes.INVALID_FILE,
          error
        );
      }

      // Generate Arranger configurations
      const configs = generateArrangerConfigs(
        mapping,
        cliOutput.config.elasticsearch.index
      );

      // Write configuration files
      const configFiles = {
        "base.json": configs.base,
        "extended.json": configs.extended,
        "table.json": configs.table,
        "facets.json": configs.facets,
      };

      for (const [filename, content] of Object.entries(configFiles)) {
        const filePath = path.join(outputPath, filename);

        // Ensure output directory exists
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }

        fs.writeFileSync(filePath, JSON.stringify(content, null, 2));
        console.log(chalk.green(`✓ Generated ${filename}`));
      }

      console.log(
        chalk.green(`\n✓ Arranger configurations saved to ${outputPath}`)
      );

      // Return the generated configs
      return configs;
    } catch (error) {
      if (error instanceof ComposerError) {
        throw error;
      }
      throw new ComposerError(
        "Error generating Arranger configurations",
        ErrorCodes.GENERATION_FAILED,
        error
      );
    }
  }
}
