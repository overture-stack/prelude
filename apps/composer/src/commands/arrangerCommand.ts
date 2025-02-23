import * as path from "path";
import * as fs from "fs";
import { Command } from "./baseCommand";
import { CLIOutput } from "../types";
import { ComposerError, ErrorCodes } from "../utils/errors";
import { generateArrangerConfigs } from "../services/generateArrangerConfigs";
import { Logger } from "../utils/logger";

export class ArrangerCommand extends Command {
  constructor() {
    super("Arranger Configs");
  }

  protected async validate(cliOutput: CLIOutput): Promise<void> {
    await super.validate(cliOutput);

    if (!cliOutput.outputPath) {
      throw new ComposerError(
        "Output path is required",
        ErrorCodes.INVALID_ARGS
      );
    }

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

    if (!fs.existsSync(filePath)) {
      throw new ComposerError(
        `File not found: ${filePath}`,
        ErrorCodes.INVALID_FILE
      );
    }
  }

  protected async execute(cliOutput: CLIOutput): Promise<any> {
    const outputPath = cliOutput.outputPath!;
    const filePath = cliOutput.filePaths[0];

    Logger.header("Generating Arranger Configurations");

    try {
      Logger.info("Reading mapping file");
      const mappingContent = fs.readFileSync(filePath, "utf-8");

      let mapping;
      try {
        mapping = JSON.parse(mappingContent);
      } catch (error) {
        throw new ComposerError(
          "Invalid JSON mapping file",
          ErrorCodes.INVALID_FILE
        );
      }

      const configs = generateArrangerConfigs(
        mapping,
        cliOutput.config.elasticsearch.index
      );

      const configFiles = {
        "base.json": configs.base,
        "extended.json": configs.extended,
        "table.json": configs.table,
        "facets.json": configs.facets,
      };

      for (const [filename, content] of Object.entries(configFiles)) {
        const filePath = path.join(outputPath, filename);
        const dir = path.dirname(filePath);

        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }

        fs.writeFileSync(filePath, JSON.stringify(content, null, 2));
        Logger.success(`Created ${filename}`);
      }

      Logger.success(`All configurations saved to ${outputPath}`);
      return configs;
    } catch (error) {
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
