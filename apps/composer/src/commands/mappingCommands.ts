import * as path from "path";
import * as fs from "fs";
import { Command } from "./baseCommand";
import { CLIOutput } from "../types";
import { ComposerError, ErrorCodes } from "../utils/errors";
import { generateMappingFromCSV } from "../services/generateEsMappingFromCSV";
import { generateMappingFromJson } from "../services/generateEsMappingFromJSON";
import { validateCSVHeaders } from "../validations";
import { parseCSVLine } from "../utils/csvParser";
import { Logger } from "../utils/logger";
import { CONFIG_PATHS } from "../utils/paths";

interface MappingOptions {
  index_pattern?: string;
  number_of_shards?: number;
  number_of_replicas?: number;
}

export class MappingCommand extends Command {
  // Define mapping-specific defaults
  protected readonly defaultOutputFileName = "mapping.json";

  constructor() {
    super("Elasticsearch Mapping", CONFIG_PATHS.elasticsearch.dir);
    // Override the default filename from the base class
    this.defaultOutputFileName = "mapping.json";
  }

  /**
   * Override isUsingDefaultPath to handle mapping-specific defaults
   */
  protected isUsingDefaultPath(cliOutput: CLIOutput): boolean {
    return (
      cliOutput.outputPath === CONFIG_PATHS.elasticsearch.mapping ||
      cliOutput.outputPath ===
        path.join(CONFIG_PATHS.elasticsearch.dir, "mapping.json") ||
      super.isUsingDefaultPath(cliOutput)
    );
  }

  protected async validate(cliOutput: CLIOutput): Promise<void> {
    await super.validate(cliOutput);

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
        "For now all input files must be of the same type (either all CSV or all JSON)",
        ErrorCodes.INVALID_FILE,
        Logger.warn(
          "Merging JSON and CSV data into a single mapping will part of a future release"
        )
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
    // Start execution timing
    const startTime = Date.now();

    let outputPath = cliOutput.outputPath!;

    // Normalize output path for mapping files specifically
    if (fs.existsSync(outputPath) && fs.statSync(outputPath).isDirectory()) {
      outputPath = path.join(outputPath, this.defaultOutputFileName);
      Logger.debug(
        `Output is a directory, will create ${this.defaultOutputFileName} inside it`
      );
    } else if (!outputPath.endsWith(".json")) {
      outputPath += ".json";
      Logger.info(`Adding .json extension to output path`);
    }

    try {
      const mappingOptions: MappingOptions = {
        index_pattern: cliOutput.config.elasticsearch?.index || "default",
        number_of_shards: cliOutput.config.elasticsearch?.shards || 1,
        number_of_replicas: cliOutput.config.elasticsearch?.replicas || 0,
      };

      Logger.debugObject("Mapping options", mappingOptions);

      // Generate mapping based on file type
      const fileExtension = path.extname(cliOutput.filePaths[0]).toLowerCase();
      const isCSV = fileExtension === ".csv";

      const finalMapping = isCSV
        ? await this.handleCSVMapping(
            cliOutput.filePaths,
            cliOutput.config.delimiter,
            mappingOptions
          )
        : await this.handleJSONMapping(cliOutput.filePaths, mappingOptions);

      // Ensure output directory exists
      const outputDir = path.dirname(outputPath);
      this.createDirectoryIfNotExists(outputDir);

      // Write mapping to file
      fs.writeFileSync(outputPath, JSON.stringify(finalMapping, null, 2));

      // Show summary
      this.logMappingSummary(finalMapping, outputPath);

      // Track total execution time
      const executionTime = Date.now() - startTime;
      Logger.timing("Execution completed in", executionTime);

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

    // Track per-file processing
    let processedFileCount = 0;

    for (const filePath of filePaths) {
      const fileStartTime = Date.now();
      Logger.info(`Processing CSV file: ${path.basename(filePath)}`);

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
      const originalHeaderCount = allHeaders.size;
      headers.forEach((header: string, index: number) => {
        allHeaders.add(header);
        if (!sampleData[header]) {
          sampleData[header] = sampleValues[index]?.toString() || "";
        }
      });

      const newHeaders = allHeaders.size - originalHeaderCount;
      processedFileCount++;

      Logger.debug(
        `Found ${headers.length} fields in ${path.basename(
          filePath
        )} (${newHeaders} new fields)`
      );

      // Show timing for large files
      const fileEndTime = Date.now();
      if (fileEndTime - fileStartTime > 500) {
        // Only show timing if processing took over 500ms
        Logger.timing(
          `Processed file ${processedFileCount}/${filePaths.length}`,
          fileEndTime - fileStartTime
        );
      }
    }

    Logger.debug(`Total unique fields found: ${allHeaders.size}`);
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
    const filePath = filePaths[0];
    Logger.info(`Processing JSON file: ${path.basename(filePath)}`);
    return generateMappingFromJson(
      filePath,
      options.index_pattern || "default"
    );
  }

  private logMappingSummary(mapping: any, outputPath: string): void {
    // Index pattern info
    Logger.info(`Index Pattern created: ${mapping.index_patterns[0]}`);

    // Aliases info
    const aliasNames = Object.keys(mapping.aliases);
    if (aliasNames.length > 0) {
      Logger.info(`Alias(es) used: ${aliasNames.join(", ")}`);
    } else {
      Logger.info("No aliases defined");
    }

    // Fields info with count
    const fieldCount = Object.keys(
      mapping.mappings.properties.data.properties
    ).length;
    Logger.info(`Total Fields Generated: ${fieldCount}`);

    // Shards and replicas
    Logger.info(`Shards: ${mapping.settings.number_of_shards}`);
    Logger.info(`Replicas: ${mapping.settings.number_of_replicas}`);
    Logger.success(`Mapping template saved to:`);
    Logger.generic(`    - ${outputPath}`);
  }
}
