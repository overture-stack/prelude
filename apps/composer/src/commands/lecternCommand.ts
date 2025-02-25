import * as path from "path";
import * as fs from "fs";
import { Command } from "./baseCommand";
import { CLIOutput } from "../types";
import { ComposerError, ErrorCodes } from "../utils/errors";
import {
  generateDictionary,
  generateSchema,
} from "../services/generateLecternDictionary";
import { parseCSVLine } from "../utils/csvParser";
import { validateCSVHeaders, validateEnvironment } from "../validations";
import { Profiles } from "../types";
import { Logger } from "../utils/logger";
import { CONFIG_PATHS } from "../utils/paths";

export class DictionaryCommand extends Command {
  // Define dictionary-specific defaults
  protected readonly defaultOutputFileName = "dictionary.json";

  constructor() {
    super("Lectern Dictionary", CONFIG_PATHS?.lectern?.dir);
    // Override the default filename from the base class
    this.defaultOutputFileName = "dictionary.json";
  }

  /**
   * Override isUsingDefaultPath to handle dictionary-specific defaults
   */
  protected isUsingDefaultPath(cliOutput: CLIOutput): boolean {
    return (
      cliOutput.outputPath === CONFIG_PATHS?.lectern?.dictionary ||
      cliOutput.outputPath ===
        path.join(CONFIG_PATHS?.lectern?.dir || "", "dictionary.json") ||
      super.isUsingDefaultPath(cliOutput)
    );
  }

  protected async validate(cliOutput: CLIOutput): Promise<void> {
    await super.validate(cliOutput);

    if (!cliOutput.outputPath) {
      throw new ComposerError(
        "Output path is required",
        ErrorCodes.INVALID_ARGS
      );
    }

    // Validate dictionary config
    if (!cliOutput.dictionaryConfig) {
      throw new ComposerError(
        "Dictionary configuration is required",
        ErrorCodes.INVALID_ARGS
      );
    }

    const config = cliOutput.dictionaryConfig;

    if (!config.name) {
      // Set a default value first
      config.name = "lectern_dictionary";

      Logger.defaultValueInfo(
        `No dictionary name supplied, defaulting to: ${config.name}`,
        "--name <name>"
      );
    }

    // Similar fixes for description and version if needed
    if (config.description === "Generated dictionary from CSV files") {
      Logger.defaultValueInfo(
        "No dictionary description supplied, using default description",
        "--description <text>"
      );
    }

    if (config.version === "1.0.0") {
      Logger.defaultValueInfo(
        "No dictionary version supplied, using default version: 1.0.0",
        "--version <version>"
      );
    }

    // Validate all files are CSVs
    const invalidFiles = cliOutput.filePaths.filter(
      (filePath) => path.extname(filePath).toLowerCase() !== ".csv"
    );

    if (invalidFiles.length > 0) {
      throw new ComposerError(
        "Lectern dictionary generation requires CSV input files",
        ErrorCodes.INVALID_FILE,
        { invalidFiles: invalidFiles.join(", ") }
      );
    }

    // Validate CSV headers
    for (const filePath of cliOutput.filePaths) {
      const csvHeadersValid = await validateCSVHeaders(
        filePath,
        cliOutput.config.delimiter
      );
      if (!csvHeadersValid) {
        throw new ComposerError(
          `CSV file ${filePath} has invalid headers`,
          ErrorCodes.VALIDATION_FAILED
        );
      }
    }
  }

  protected async execute(cliOutput: CLIOutput): Promise<any> {
    const { dictionaryConfig } = cliOutput;
    const delimiter = cliOutput.config.delimiter;

    // Get output path, similar to MappingCommand
    let outputPath = cliOutput.outputPath!;

    // Normalize output path for dictionary files specifically
    if (fs.existsSync(outputPath) && fs.statSync(outputPath).isDirectory()) {
      outputPath = path.join(outputPath, this.defaultOutputFileName);
      Logger.debug(
        `Output is a directory, will create ${this.defaultOutputFileName} inside it`
      );
    } else if (!outputPath.endsWith(".json")) {
      outputPath += ".json";
      Logger.info`Adding .json extension to output path`;
    }

    try {
      // Validate environment
      await validateEnvironment({
        profile: Profiles.GENERATE_LECTERN_DICTIONARY,
        outputPath: outputPath,
      });

      const dictionary = generateDictionary(
        dictionaryConfig!.name,
        dictionaryConfig!.description,
        dictionaryConfig!.version
      );

      for (const filePath of cliOutput.filePaths) {
        try {
          const fileContent = fs.readFileSync(filePath, "utf-8");
          const [headerLine, sampleLine] = fileContent.split("\n");

          if (!headerLine) {
            throw new ComposerError(
              `CSV file ${filePath} is empty or has no headers`,
              ErrorCodes.INVALID_FILE
            );
          }

          const headers = parseCSVLine(headerLine, delimiter, true)[0];
          if (!headers) {
            throw new ComposerError(
              `Failed to parse CSV headers in ${filePath}`,
              ErrorCodes.INVALID_FILE
            );
          }

          // Process sample data
          const sampleData: Record<string, string> = {};
          if (sampleLine) {
            const sampleValues = parseCSVLine(sampleLine, delimiter, false)[0];
            if (sampleValues) {
              headers.forEach((header: string, index: number) => {
                sampleData[header] = sampleValues[index] || "";
              });
            }
          }

          // Pass the full file path to generateSchema to extract the schema name
          const schema = generateSchema(filePath, headers, sampleData);
          dictionary.schemas.push(schema);
          Logger.debug`Generated schema for ${schema.name}`;
        } catch (error) {
          Logger.warn`Skipping ${filePath} due to error: ${error}`;
          continue;
        }
      }

      // Ensure output directory exists
      const outputDir = path.dirname(outputPath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
        Logger.debug`Created output directory: ${outputDir}`;
      }

      // Write dictionary to file
      fs.writeFileSync(outputPath, JSON.stringify(dictionary, null, 2));
      Logger.success`Dictionary saved to ${outputPath}`;

      return dictionary;
    } catch (error) {
      if (error instanceof ComposerError) {
        throw error;
      }
      throw new ComposerError(
        "Error generating Lectern dictionary",
        ErrorCodes.GENERATION_FAILED,
        error
      );
    }
  }
}
