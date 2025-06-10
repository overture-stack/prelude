// src/commands/lecternCommand.ts - MIGRATED VERSION
// Shows how to apply the error handling and logger standardization

import * as path from "path";
import * as fs from "fs";
import { Command } from "./baseCommand";
import { CLIOutput } from "../types";
import { ComposerError, ErrorCodes, ErrorFactory } from "../utils/errors"; // UPDATED IMPORT
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
      // UPDATED: Use ErrorFactory instead of new ComposerError
      throw ErrorFactory.args("Output path is required", [
        "Use -o or --output to specify an output path",
        "Example: -o /path/to/dictionary.json",
      ]);
    }

    // Validate dictionary config
    if (!cliOutput.dictionaryConfig) {
      // UPDATED: Use ErrorFactory with helpful suggestions
      throw ErrorFactory.args("Dictionary configuration is required", [
        "Use --name, --description, or --version to configure the dictionary",
        "Example: --name 'My Dictionary' --version '2.0.0'",
      ]);
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

    // Get only CSV files from the paths (already expanded in base class)
    const csvFiles = cliOutput.filePaths.filter(
      (filePath) => path.extname(filePath).toLowerCase() === ".csv"
    );

    // Check if we've got valid CSV files
    if (csvFiles.length === 0) {
      // UPDATED: Use ErrorFactory with helpful suggestions
      throw ErrorFactory.file(
        "Lectern dictionary generation requires CSV input files",
        undefined,
        [
          "Ensure your input files have .csv extension",
          "Check that the files exist and are accessible",
          "Example: -f data.csv metadata.csv",
        ]
      );
    }

    // If we filtered out some non-CSV files, log which ones were skipped
    if (csvFiles.length < cliOutput.filePaths.length) {
      const skippedFiles = cliOutput.filePaths.filter(
        (filePath) => path.extname(filePath).toLowerCase() !== ".csv"
      );

      // UPDATED: Use template literal
      Logger.warn`Skipping ${skippedFiles.length} non-CSV files`;
      skippedFiles.forEach((file) => {
        Logger.generic(`  - ${file}`);
      });
    }

    // Update filePaths to only include CSV files
    cliOutput.filePaths = csvFiles;
    // UPDATED: Use template literal
    Logger.info`Processing ${csvFiles.length} CSV files`;

    // Validate CSV headers for each file - use csvDelimiter directly
    const validFiles: string[] = [];
    const invalidFiles: string[] = [];

    for (const filePath of cliOutput.filePaths) {
      try {
        const csvHeadersValid = await validateCSVHeaders(
          filePath,
          cliOutput.csvDelimiter // Access delimiter directly
        );
        if (csvHeadersValid) {
          validFiles.push(filePath);
        } else {
          invalidFiles.push(filePath);
        }
      } catch (error) {
        // UPDATED: Use template literal
        Logger.warn`Error validating CSV headers in ${filePath}: ${error}`;
        invalidFiles.push(filePath);
      }
    }

    // If some files are invalid, warn and continue with valid ones
    if (invalidFiles.length > 0) {
      // UPDATED: Use template literal
      Logger.warn`Skipping ${invalidFiles.length} files with invalid headers`;
      invalidFiles.forEach((file) => {
        Logger.generic(`  - ${path.basename(file)}`);
      });

      // Update filePaths to only include valid files
      cliOutput.filePaths = validFiles;
    }

    // Ensure we still have files to process
    if (cliOutput.filePaths.length === 0) {
      // UPDATED: Use ErrorFactory with helpful suggestions
      throw ErrorFactory.validation(
        "No valid CSV files found with proper headers",
        { invalidFiles },
        [
          "Check that CSV files have valid column headers",
          "Headers should not contain special characters or be empty",
          "Ensure files are properly formatted CSV files",
        ]
      );
    }

    // UPDATED: Use template literal
    Logger.info`Found ${cliOutput.filePaths.length} valid CSV files to process`;
  }

  protected async execute(cliOutput: CLIOutput): Promise<any> {
    const { dictionaryConfig } = cliOutput;
    const delimiter = cliOutput.csvDelimiter; // Access delimiter directly

    // Get output path, similar to MappingCommand
    let outputPath = cliOutput.outputPath!;

    // Normalize output path for dictionary files specifically
    if (fs.existsSync(outputPath) && fs.statSync(outputPath).isDirectory()) {
      outputPath = path.join(outputPath, this.defaultOutputFileName);
      // UPDATED: Use template literal
      Logger.debug`Output is a directory, will create ${this.defaultOutputFileName} inside it`;
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

      let processedFiles = 0;
      let skippedFiles = 0;

      for (const filePath of cliOutput.filePaths) {
        try {
          const fileContent = fs.readFileSync(filePath, "utf-8");
          const [headerLine, sampleLine] = fileContent.split("\n");

          if (!headerLine) {
            // UPDATED: Use template literal
            Logger.warn`CSV file ${path.basename(
              filePath
            )} is empty or has no headers. Skipping.`;
            skippedFiles++;
            continue;
          }

          const headers = parseCSVLine(headerLine, delimiter, true)[0];
          if (!headers) {
            // UPDATED: Use template literal
            Logger.warn`Failed to parse CSV headers in ${path.basename(
              filePath
            )}. Skipping.`;
            skippedFiles++;
            continue;
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
          // UPDATED: Use template literal
          Logger.debug`Generated schema for ${schema.name}`;
          processedFiles++;
        } catch (error) {
          // UPDATED: Use template literal
          Logger.warn`Skipping ${path.basename(
            filePath
          )} due to error: ${error}`;
          skippedFiles++;
          continue;
        }
      }

      // Log summary of processing - UPDATED: Use template literals
      Logger.info`Successfully processed ${processedFiles} CSV files`;
      if (skippedFiles > 0) {
        Logger.warn`Skipped ${skippedFiles} files due to errors`;
      }

      // Ensure output directory exists
      const outputDir = path.dirname(outputPath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
        // UPDATED: Use template literal
        Logger.debug`Created output directory: ${outputDir}`;
      }

      // Write dictionary to file
      fs.writeFileSync(outputPath, JSON.stringify(dictionary, null, 2));
      // UPDATED: Use template literal
      Logger.success`Dictionary saved to ${outputPath}`;

      return dictionary;
    } catch (error) {
      if (error instanceof ComposerError) {
        throw error;
      }
      // UPDATED: Use ErrorFactory
      throw ErrorFactory.generation(
        "Error generating Lectern dictionary",
        error,
        [
          "Check that all CSV files are properly formatted",
          "Ensure output directory is writable",
          "Verify file permissions and disk space",
        ]
      );
    }
  }
}
