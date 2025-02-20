import * as path from "path";
import * as fs from "fs";
import { Command } from "./baseCommand";
import { CLIOutput } from "../types";
import { ComposerError, ErrorCodes } from "../utils/errors";
import { generateMappingFromCSV } from "../services/generateEsMappingFromCSV";
import { generateMappingFromJson } from "../services/generateEsMappingFromJSON";
import { validateCSVHeaders, validateEnvironment } from "../validations";
import { parseCSVLine } from "../utils/csvParser";
import chalk from "chalk";
import { Profiles } from "../types";

/**
 * Options for configuring Elasticsearch mapping generation
 */
interface MappingOptions {
  index_pattern?: string; // Pattern for the index name
  number_of_shards?: number; // Number of shards for the index
  number_of_replicas?: number; // Number of replicas for the index
}

/**
 * Command for generating Elasticsearch mappings from CSV or JSON files.
 * Supports multiple input files of the same type and provides validation
 * and error handling throughout the process.
 */
export class MappingCommand extends Command {
  constructor() {
    super("Elasticsearch Mapping");
  }

  /**
   * Validates the command input parameters and file types.
   * Ensures all input files are of the same type (CSV or JSON)
   * and that required parameters are present.
   */
  protected async validate(cliOutput: CLIOutput): Promise<void> {
    await super.validate(cliOutput);

    if (!cliOutput.outputPath) {
      throw new ComposerError(
        "Output path is required",
        ErrorCodes.INVALID_ARGS
      );
    }

    // Validate file extensions
    const validExtensions = [".csv", ".json"];
    const invalidFiles = cliOutput.filePaths.filter(
      (filePath) =>
        !validExtensions.includes(path.extname(filePath).toLowerCase())
    );

    if (invalidFiles.length > 0) {
      throw new ComposerError(
        "Invalid file types detected. Only .csv and .json files are supported",
        ErrorCodes.INVALID_FILE,
        { invalidFiles }
      );
    }

    // Ensure all files are of the same type
    const extensions = cliOutput.filePaths.map((filePath) =>
      path.extname(filePath).toLowerCase()
    );

    if (new Set(extensions).size > 1) {
      throw new ComposerError(
        "All input files must be of the same type (either all CSV or all JSON)",
        ErrorCodes.INVALID_FILE
      );
    }

    // Validate index pattern if provided
    if (cliOutput.config.elasticsearch?.index) {
      if (!/^[a-z0-9][a-z0-9_-]*$/.test(cliOutput.config.elasticsearch.index)) {
        throw new ComposerError(
          "Invalid index pattern. Must start with a letter or number and contain only lowercase letters, numbers, hyphens, and underscores",
          ErrorCodes.INVALID_ARGS
        );
      }
    }
  }

  /**
   * Executes the mapping generation process:
   * 1. Determines appropriate output path
   * 2. Processes input files (CSV or JSON)
   * 3. Generates and saves the Elasticsearch mapping
   * 4. Logs a summary of the generated mapping
   */
  protected async execute(cliOutput: CLIOutput): Promise<any> {
    let outputPath = cliOutput.outputPath!;

    // Normalize output path
    if (fs.existsSync(outputPath) && fs.statSync(outputPath).isDirectory()) {
      outputPath = path.join(outputPath, "mapping.json");
    } else if (!outputPath.endsWith(".json")) {
      outputPath = outputPath + ".json";
    }

    console.log(chalk.cyan("\nGenerating Elasticsearch Mapping..."));

    try {
      const mappingOptions: MappingOptions = {
        index_pattern: cliOutput.config.elasticsearch?.index || "default",
        number_of_shards: cliOutput.config.elasticsearch?.shards,
        number_of_replicas: cliOutput.config.elasticsearch?.replicas,
      };

      // Generate mapping based on file type
      const fileExtension = path.extname(cliOutput.filePaths[0]).toLowerCase();
      const finalMapping =
        fileExtension === ".csv"
          ? await this.handleCSVMapping(
              cliOutput.filePaths,
              cliOutput.config.delimiter,
              mappingOptions
            )
          : await this.handleJSONMapping(cliOutput.filePaths, mappingOptions);

      // Ensure output directory exists using validation utility
      await validateEnvironment({
        profile: Profiles.GENERATE_ELASTICSEARCH_MAPPING,
        outputPath: outputPath,
      });

      // Write mapping to file
      fs.writeFileSync(outputPath, JSON.stringify(finalMapping, null, 2));
      console.log(
        chalk.green(`✓ Elasticsearch mapping saved to ${outputPath}`)
      );

      // Log summary
      this.logMappingSummary(finalMapping);

      return finalMapping;
    } catch (error) {
      if (error instanceof ComposerError) {
        throw error;
      }
      throw new ComposerError(
        "Error generating Elasticsearch mapping",
        ErrorCodes.GENERATION_FAILED,
        error
      );
    }
  }

  /**
   * Processes CSV files to generate a mapping:
   * - Validates headers in each file
   * - Combines headers from all files
   * - Collects sample data for type inference
   *
   * @param filePaths - Array of paths to CSV files
   * @param delimiter - CSV delimiter character
   * @param options - Mapping configuration options
   * @returns Generated Elasticsearch mapping
   */
  private async handleCSVMapping(
    filePaths: string[],
    delimiter: string,
    options: MappingOptions
  ) {
    const allHeaders: Set<string> = new Set();
    const sampleData: Record<string, string> = {};

    for (const filePath of filePaths) {
      // Validate CSV structure
      const csvHeadersValid = await validateCSVHeaders(filePath, delimiter);
      if (!csvHeadersValid) {
        throw new ComposerError(
          `CSV file ${filePath} has invalid headers`,
          ErrorCodes.VALIDATION_FAILED
        );
      }

      // Parse file content
      const fileContent = fs.readFileSync(filePath, "utf-8");
      const [headerLine, sampleLine] = fileContent.split("\n");

      if (!headerLine || !sampleLine) {
        throw new ComposerError(
          `CSV file ${filePath} must contain at least a header row and one data row`,
          ErrorCodes.INVALID_FILE
        );
      }

      // Extract headers and sample data
      const headers = parseCSVLine(headerLine, delimiter, true)[0];
      const sampleValues = parseCSVLine(sampleLine, delimiter, false)[0];

      if (!headers || !sampleValues) {
        throw new ComposerError(
          `Failed to parse CSV headers or sample data in ${filePath}`,
          ErrorCodes.INVALID_FILE
        );
      }

      // Merge headers and sample data
      headers.forEach((header: string, index: number) => {
        allHeaders.add(header);
        if (!sampleData[header]) {
          sampleData[header] = sampleValues[index]?.toString() || "";
        }
      });
    }

    return generateMappingFromCSV(
      Array.from(allHeaders),
      sampleData,
      options.index_pattern || "default"
    );
  }

  /**
   * Processes JSON files to generate a mapping.
   * Currently only supports single file processing.
   *
   * @param filePaths - Array of paths to JSON files
   * @param options - Mapping configuration options
   * @returns Generated Elasticsearch mapping
   */
  private async handleJSONMapping(
    filePaths: string[],
    options: MappingOptions
  ) {
    return generateMappingFromJson(
      filePaths[0],
      options.index_pattern || "default"
    );
  }

  /**
   * Logs a summary of the generated mapping including:
   * - Index pattern
   * - Aliases
   * - Number of fields
   * - Shard configuration
   * - Replica configuration
   */
  private logMappingSummary(mapping: any): void {
    console.log(chalk.cyan("\nMapping Summary:"));
    console.log(chalk.white(`Index Pattern: ${mapping.index_patterns[0]}`));
    console.log(
      chalk.white(`Aliases: ${Object.keys(mapping.aliases).join(", ")}`)
    );
    console.log(
      chalk.white(
        `Number of Fields: ${
          Object.keys(mapping.mappings.properties.data.properties).length
        }`
      )
    );
    console.log(chalk.white(`Shards: ${mapping.settings.number_of_shards}`));
    console.log(
      chalk.white(`Replicas: ${mapping.settings.number_of_replicas}`)
    );
  }
}
