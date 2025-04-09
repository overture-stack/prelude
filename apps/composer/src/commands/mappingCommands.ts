import * as path from "path";
import * as fs from "fs";
import { Command } from "./baseCommand";
import { CLIOutput } from "../types";
import { ComposerError, ErrorCodes } from "../utils/errors";
import { generateMappingFromCSV } from "../services/generateEsMappingFromCSV";
import {
  generateMappingFromJson,
  // Renamed to avoid conflict
  MappingOptions as JsonMappingOptions,
} from "../services/generateEsMappingFromJSON";
import { validateCSVHeaders } from "../validations";
import { parseCSVLine } from "../utils/csvParser";
import { Logger } from "../utils/logger";
import { CONFIG_PATHS } from "../utils/paths";
import { ElasticsearchMapping } from "../types/elasticsearch";
import { ElasticsearchField } from "../types/elasticsearch";

// Local interface for mapping options
interface MappingOptions {
  index_pattern?: string;
  number_of_shards?: number;
  number_of_replicas?: number;
  ignoredFields?: string[];
  skipMetadata?: boolean;
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
   * Recursively count fields in an Elasticsearch mapping
   */
  private countFields(properties: Record<string, ElasticsearchField>): number {
    let count = 0;

    const recurseCount = (props: Record<string, ElasticsearchField>) => {
      for (const [, field] of Object.entries(props)) {
        count++;

        // Recursively count nested object or nested type properties
        if (field.properties) {
          recurseCount(field.properties);
        }
      }
    };

    recurseCount(properties);
    return count;
  }

  /**
   * Analyze field types in an Elasticsearch mapping
   */
  private analyzeFieldTypes(properties: Record<string, ElasticsearchField>): {
    topLevelFields: number;
    nestedFields: number;
    typeDistribution: Record<string, number>;
  } {
    let topLevelFields = 0;
    let nestedFields = 0;
    const typeDistribution: Record<string, number> = {};

    const analyzeRecursive = (
      props: Record<string, ElasticsearchField>,
      isTopLevel: boolean = true
    ) => {
      for (const [, field] of Object.entries(props)) {
        // Count top-level vs nested fields
        if (isTopLevel) topLevelFields++;
        else nestedFields++;

        // Track field types
        const type = field.type;
        typeDistribution[type] = (typeDistribution[type] || 0) + 1;

        // Recursively analyze nested properties
        if (field.properties) {
          analyzeRecursive(field.properties, false);
        }
      }
    };

    analyzeRecursive(properties);

    return {
      topLevelFields,
      nestedFields,
      typeDistribution,
    };
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
      Logger.info`Adding .json extension to output path`;
    }

    try {
      const mappingOptions: MappingOptions = {
        index_pattern: cliOutput.config.elasticsearch?.index || "default",
        number_of_shards: cliOutput.config.elasticsearch?.shards || 1,
        number_of_replicas: cliOutput.config.elasticsearch?.replicas || 0,
        ignoredFields: cliOutput.config.elasticsearch?.ignoredFields || [],
        skipMetadata: cliOutput.config.elasticsearch?.skipMetadata || false,
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
      this.logMappingSummary(finalMapping, outputPath, mappingOptions);

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
      Logger.info`Processing CSV file: ${path.basename(filePath)}`;

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

    Logger.debug`Total unique fields found: ${allHeaders.size}`;
    return generateMappingFromCSV(
      Array.from(allHeaders),
      sampleData,
      options.index_pattern || "default",
      { skipMetadata: options.skipMetadata }
    );
  }

  private async handleJSONMapping(
    filePaths: string[],
    options: MappingOptions
  ) {
    const filePath = filePaths[0];
    Logger.info`Processing JSON file: ${path.basename(filePath)}`;

    // Convert from local MappingOptions to JsonMappingOptions
    const jsonOptions: JsonMappingOptions = {
      ignoredFields: options.ignoredFields,
      skipMetadata: options.skipMetadata, // Pass the skipMetadata option
    };

    return generateMappingFromJson(
      filePath,
      options.index_pattern || "default",
      jsonOptions
    );
  }
  private logMappingSummary(
    mapping: ElasticsearchMapping,
    outputPath: string,
    options: MappingOptions
  ): void {
    try {
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
      const fieldCount = this.countFields(mapping.mappings.properties);

      // Breakdown of field types
      const fieldBreakdown = this.analyzeFieldTypes(
        mapping.mappings.properties
      );

      // Log detailed field information
      Logger.info(
        `Field Analysis: ${fieldCount} total fields\n` +
          `  • Top-level fields: ${fieldBreakdown.topLevelFields}\n` +
          `  • Nested array fields: ${fieldBreakdown.nestedFields}\n` +
          `  • Field types: ${Object.entries(fieldBreakdown.typeDistribution)
            .map(([type, count]) => `${count} ${type}`)
            .join(", ")}`
      );

      // Metadata skipping info
      if (options.skipMetadata) {
        Logger.info("Submission metadata excluded from mapping");
      }

      // Shards and replicas
      Logger.info(`Shards: ${mapping.settings.number_of_shards}`);
      Logger.info(`Replicas: ${mapping.settings.number_of_replicas}`);

      // Ensure success logging
      Logger.success("Elasticsearch mapping generated successfully");

      // Use generic logging for file path to avoid template literal issues
      Logger.generic(`Mapping template saved to: ${outputPath}`);
    } catch (error) {
      // Fallback logging in case of any unexpected errors
      Logger.error("Error in logging mapping summary");
      Logger.debug(`${error}`);
    }
  }
}
