import chalk from "chalk";
import * as fs from "fs";
import * as path from "path";
import { parseCSVLine } from "../utils/csv";
import { generateMappingFromCSV } from "./CSVmapping";
import { generateMappingFromJson } from "./JSONmapping";
import type { ElasticsearchMapping } from "../types/elasticsearch";

interface PathValidationConfig {
  composerPath?: string;
  dataFile?: string;
  esConfigDir?: string;
  arrangerConfigDir?: string;
  lecternDictionary?: string;
  songSchema?: string;
}

export async function validateEnvironment(
  config: PathValidationConfig
): Promise<boolean> {
  console.log(chalk.yellow("\nDebug: Checking environment configuration..."));

  // Log all paths for debugging
  Object.entries(config).forEach(([key, value]) => {
    console.log(chalk.blue(`  ${key}:`), value || "Not set");
  });

  // Validate composer path
  if (!config.composerPath) {
    console.error(chalk.red("Error: COMPOSER_PATH is not set"));
    return false;
  }

  if (!fs.existsSync(config.composerPath)) {
    console.error(
      chalk.red(
        `Error: Composer directory does not exist: ${config.composerPath}`
      )
    );
    return false;
  }

  // Validate data file if provided
  if (config.dataFile) {
    if (!(await validateFile(config.dataFile))) {
      return false;
    }
  }

  // Create output directories if they don't exist
  const directories = [
    config.esConfigDir,
    config.arrangerConfigDir,
    config.lecternDictionary,
    config.songSchema,
  ].filter(Boolean);

  for (const dir of directories) {
    if (dir && !fs.existsSync(dir)) {
      try {
        fs.mkdirSync(dir, { recursive: true });
        console.log(chalk.green(`✓ Created directory: ${dir}`));
      } catch (error) {
        console.error(chalk.red(`Error creating directory ${dir}:`, error));
        return false;
      }
    }
  }

  console.log(chalk.green("\n✓ Environment validation completed successfully"));
  return true;
}

/**
 * Determines if a file is JSON based on extension and content
 */
function isJsonFile(filePath: string): boolean {
  // Check extension
  if (path.extname(filePath).toLowerCase() === ".json") {
    try {
      // Try to parse the content
      const content = fs.readFileSync(filePath, "utf-8");
      JSON.parse(content);
      return true;
    } catch (error) {
      console.error(
        chalk.red(`File has .json extension but is not valid JSON: ${filePath}`)
      );
      return false;
    }
  }
  return false;
}

/**
 * Validates file accessibility and content.
 */
export async function validateFile(filePath: string): Promise<boolean> {
  try {
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.error(chalk.red(`Error: File '${filePath}' does not exist`));
      return false;
    }

    // Check if directory exists
    const dirPath = path.dirname(filePath);
    if (!fs.existsSync(dirPath)) {
      console.error(chalk.red(`Error: Directory does not exist: ${dirPath}`));
      return false;
    }

    // Check if file is readable
    try {
      fs.accessSync(filePath, fs.constants.R_OK);
    } catch (error) {
      console.error(chalk.red(`Error: File '${filePath}' is not readable`));
      return false;
    }

    // Check if file is empty
    const stats = fs.statSync(filePath);
    if (stats.size === 0) {
      console.error(chalk.red(`Error: File '${filePath}' is empty`));
      return false;
    }

    console.log(chalk.green(`✓ File '${filePath}' is valid and readable`));
    return true;
  } catch (error) {
    console.error(chalk.red(`Error validating file: ${error}`));
    return false;
  }
}

/**
 * Validates CSV header structure.
 */
export async function validateCSVStructure(
  headers: string[]
): Promise<boolean> {
  try {
    const cleanedHeaders = headers
      .map((header) => header.trim())
      .filter((header) => header !== "");

    if (cleanedHeaders.length === 0) {
      console.error(
        chalk.red("\n❌ Error: No valid headers found in CSV file\n")
      );
      return false;
    }

    if (cleanedHeaders.length !== headers.length) {
      console.error(
        chalk.red("\n❌ Error: Empty or whitespace-only headers detected\n")
      );
      return false;
    }

    // Validation constants for header names
    const invalidChars = [
      ":",
      ">",
      "<",
      ".",
      " ",
      ",",
      "/",
      "\\",
      "?",
      "#",
      "[",
      "]",
      "{",
      "}",
      '"',
      "*",
      "|",
      "+",
      "@",
      "&",
      "(",
      ")",
      "!",
      "^",
    ];
    const maxLength = 255;
    const reservedWords = [
      "_type",
      "_id",
      "_source",
      "_all",
      "_parent",
      "_field_names",
      "_routing",
      "_index",
      "_size",
      "_timestamp",
      "_ttl",
      "_meta",
      "_doc",
      "__typename",
      "__schema",
      "__type",
    ];
    const graphqlNamePattern = /^[A-Za-z_][A-Za-z0-9_]*$/;

    const invalidHeaders = cleanedHeaders.filter((header: string) => {
      const hasInvalidChars = invalidChars.some((char) =>
        header.includes(char)
      );
      const isTooLong = Buffer.from(header).length > maxLength;
      const isReserved = reservedWords.includes(header.toLowerCase());
      const isValidGraphQLName = graphqlNamePattern.test(header);
      return hasInvalidChars || isTooLong || isReserved || !isValidGraphQLName;
    });

    if (invalidHeaders.length > 0) {
      console.error(chalk.red("\n❌ Error: Invalid header names detected\n"));
      invalidHeaders.forEach((header: string) => {
        console.log(chalk.yellow(`├─ "${header}"`));
      });
      return false;
    }

    // Check for duplicate headers
    const headerCounts: Record<string, number> = cleanedHeaders.reduce(
      (acc: Record<string, number>, header: string) => {
        acc[header] = (acc[header] || 0) + 1;
        return acc;
      },
      {}
    );
    const duplicates = Object.entries(headerCounts)
      .filter(([_, count]) => count > 1)
      .map(([header, _]) => header);

    if (duplicates.length > 0) {
      console.error(
        chalk.red("\n❌ Error: Duplicate headers found in CSV file\n")
      );
      duplicates.forEach((header) => {
        console.log(
          chalk.yellow(
            `├─ Duplicate header: "${header}" appears ${headerCounts[header]} times`
          )
        );
      });
      return false;
    }

    console.log(chalk.green("\n✓ CSV header structure is valid.\n"));
    return true;
  } catch (error) {
    console.error(chalk.red(`\nError validating CSV structure: ${error}\n`));
    return false;
  }
}

/**
 * Validates CSV delimiter configuration.
 */
export function validateDelimiter(delimiter: string): boolean {
  if (!delimiter || delimiter.length !== 1) {
    console.error(chalk.red("Error: Invalid delimiter"));
    console.log(chalk.yellow("Delimiter must be a single character"));
    return false;
  }
  return true;
}

/**
 * Validates and extracts mapping information from CSV or JSON file
 * @param filePath - Path to the input file
 * @param delimiter - CSV delimiter character (optional, only used for CSV files)
 * @returns Promise resolving to Elasticsearch mapping object
 */
export async function validateAndGetMapping(
  filePath: string,
  delimiter?: string
): Promise<ElasticsearchMapping> {
  try {
    // Validate file exists and is readable
    if (!(await validateFile(filePath))) {
      throw new Error(`File validation failed for: ${filePath}`);
    }

    const fileExtension = path.extname(filePath).toLowerCase();

    switch (fileExtension) {
      case ".csv":
        if (!delimiter) {
          throw new Error("Delimiter is required for CSV files");
        }

        // Read first two lines for mapping generation
        const fileContent = fs.readFileSync(filePath, "utf-8");
        const [headerLine, sampleLine] = fileContent.split("\n");

        if (!headerLine || !sampleLine) {
          throw new Error(
            "CSV file must contain at least a header row and one data row"
          );
        }

        const headers = parseCSVLine(headerLine, delimiter, true)[0];
        const sampleValues = parseCSVLine(sampleLine, delimiter, false)[0];

        if (!headers || !sampleValues) {
          throw new Error("Failed to parse CSV headers or sample data");
        }

        // Validate CSV structure before generating mapping
        const isValid = await validateCSVStructure(headers);
        if (!isValid) {
          throw new Error(
            "CSV header validation failed. Please fix the headers according to the above suggestions and try again."
          );
        }

        // Create sample data object
        const sampleData: Record<string, string> = {};
        headers.forEach((header: string, index: number) => {
          sampleData[header] = sampleValues[index]?.toString() || "";
        });

        return generateMappingFromCSV(headers, sampleData);

      case ".json":
        return generateMappingFromJson(filePath);

      default:
        throw new Error(
          `Unsupported file type: ${fileExtension}. Use .csv or .json`
        );
    }
  } catch (error) {
    console.error(chalk.red(`\n❌ Error in validateAndGetMapping: ${error}\n`));
    throw error;
  }
}

/**
 * Validates npm dependencies installation with optional installation
 */
export async function validateDependencies(
  composerPath: string
): Promise<boolean> {
  console.log(
    chalk.cyan("\nConfig Generator: Setting up configuration generator")
  );

  try {
    console.log(chalk.magenta("[1/2] Checking Composer dependencies"));

    // Check if node_modules exists
    const nodeModulesPath = path.join(composerPath, "node_modules");
    if (!fs.existsSync(nodeModulesPath)) {
      console.log(
        chalk.yellow("node_modules not found. Consider running 'npm install'")
      );
      return false;
    }

    console.log(chalk.green("✓ Dependencies are present"));
    return true;
  } catch (error) {
    console.error(chalk.red("Error: Failed to validate dependencies"), error);
    return false;
  }
}
