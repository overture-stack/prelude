import * as path from "path";
import * as fs from "fs";
import { Command } from "./baseCommand";
import { CLIOutput } from "../types";
import { ComposerError, ErrorCodes } from "../utils/errors";
import { generateMappingFromCSV } from "../services/generateEsMappingFromCSV";
import { generateMappingFromJson } from "../services/generateEsMappingFromJSON";
import { validateCSVHeaders, validateEnvironment } from "../validations";
import { parseCSVLine } from "../utils/csvParser";
import { Profiles } from "../types";
import { Logger } from "../utils/logger";

interface MappingOptions {
  index_pattern?: string;
  number_of_shards?: number;
  number_of_replicas?: number;
}

export class MappingCommand extends Command {
  constructor() {
    super("Elasticsearch Mapping");
  }

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

    // Ensure all files are the same type
    const extensions = new Set(
      cliOutput.filePaths.map((filePath) =>
        path.extname(filePath).toLowerCase()
      )
    );
    if (extensions.size > 1) {
      throw new ComposerError(
        "All input files must be of the same type (either all CSV or all JSON)",
        ErrorCodes.INVALID_FILE
      );
    }

    // Validate index pattern
    if (cliOutput.config.elasticsearch?.index) {
      if (!/^[a-z0-9][a-z0-9_-]*$/.test(cliOutput.config.elasticsearch.index)) {
        throw new ComposerError(
          "Invalid index pattern. Must start with a letter or number and contain only lowercase letters, numbers, hyphens, and underscores",
          ErrorCodes.INVALID_ARGS
        );
      }
    }
  }

  protected async execute(cliOutput: CLIOutput): Promise<any> {
    let outputPath = cliOutput.outputPath!;

    // Normalize output path
    if (fs.existsSync(outputPath) && fs.statSync(outputPath).isDirectory()) {
      outputPath = path.join(outputPath, "mapping.json");
    } else if (!outputPath.endsWith(".json")) {
      outputPath += ".json";
    }

    Logger.header("Generating Elasticsearch Mapping");

    try {
      const mappingOptions: MappingOptions = {
        index_pattern: cliOutput.config.elasticsearch?.index || "default",
        number_of_shards: cliOutput.config.elasticsearch?.shards,
        number_of_replicas: cliOutput.config.elasticsearch?.replicas,
      };

      Logger.debugObject("Mapping options", mappingOptions);

      // Generate mapping based on file type
      const fileExtension = path.extname(cliOutput.filePaths[0]).toLowerCase();
      const isCSV = fileExtension === ".csv";

      Logger.info(`Processing ${isCSV ? "CSV" : "JSON"} files`);
      const finalMapping = isCSV
        ? await this.handleCSVMapping(
            cliOutput.filePaths,
            cliOutput.config.delimiter,
            mappingOptions
          )
        : await this.handleJSONMapping(cliOutput.filePaths, mappingOptions);

      // Ensure output directory exists
      await validateEnvironment({
        profile: Profiles.GENERATE_ELASTICSEARCH_MAPPING,
        outputPath: outputPath,
      });

      // Write mapping to file
      fs.writeFileSync(outputPath, JSON.stringify(finalMapping, null, 2));
      Logger.success(`Mapping saved to ${outputPath}`);

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

  private async handleCSVMapping(
    filePaths: string[],
    delimiter: string,
    options: MappingOptions
  ) {
    const allHeaders: Set<string> = new Set();
    const sampleData: Record<string, string> = {};

    for (const filePath of filePaths) {
      Logger.debug(`Processing CSV file: ${filePath}`);

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

      Logger.debug(
        `Found ${headers.length} fields in ${path.basename(filePath)}`
      );
    }

    Logger.info(`Total unique fields found: ${allHeaders.size}`);
    return generateMappingFromCSV(
      Array.from(allHeaders),
      sampleData,
      options.index_pattern || "default"
    );
  }

  private async handleJSONMapping(
    filePaths: string[],
    options: MappingOptions
  ) {
    Logger.debug(`Processing JSON file: ${filePaths[0]}`);
    return generateMappingFromJson(
      filePaths[0],
      options.index_pattern || "default"
    );
  }

  private logMappingSummary(mapping: any): void {
    Logger.info("Mapping Summary");
    Logger.info(`Index Pattern: ${mapping.index_patterns[0]}`);
    Logger.info(`Aliases: ${Object.keys(mapping.aliases).join(", ")}`);
    Logger.info(
      `Fields: ${
        Object.keys(mapping.mappings.properties.data.properties).length
      }`
    );
    Logger.info(`Shards: ${mapping.settings.number_of_shards}`);
    Logger.info(`Replicas: ${mapping.settings.number_of_replicas}`);
  }
}
