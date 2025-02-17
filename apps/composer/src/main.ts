#!/usr/bin/env node

import { setupCLI, Profile, CLIMode } from "./utils/cli";
import * as validations from "./services/validations";
import { generateArrangerConfigs } from "./services/arranger";
import { generateDictionary, generateSchema } from "./services/lectern";
import { generateSongSchema, validateSongSchema } from "./services/song";
import { generateMappingFromCSV } from "./services/CSVmapping";
import { generateMappingFromJson } from "./services/JSONmapping";
import { parseCSVLine } from "./utils/csv";
import { Profiles, CLIModes, Config, CLIOutput } from "./types";
import chalk from "chalk";
import * as fs from "fs";
import * as path from "path";

// CSV headers validation function
async function validateCSVHeaders(
  filePath: string,
  delimiter: string
): Promise<boolean> {
  try {
    const fileContent = fs.readFileSync(filePath, "utf-8");
    const [headerLine] = fileContent.split("\n");

    if (!headerLine) {
      console.error(chalk.red("Error: CSV file is empty or has no headers"));
      return false;
    }

    const headers = parseCSVLine(headerLine, delimiter, true)[0];
    if (!headers) {
      console.error(chalk.red("Error: Failed to parse CSV headers"));
      return false;
    }

    // Validate CSV structure using our validation function
    const isValid = await validations.validateCSVStructure(headers);
    if (!isValid) {
      console.error(chalk.red("Error: CSV headers failed validation"));
      return false;
    }

    return true;
  } catch (error) {
    console.error(chalk.red("Error validating CSV headers:"), error);
    return false;
  }
}

// Ensure output directory exists
function ensureDirectoryExists(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

// Handler functions (copied from previous implementation)
async function handleSongMode(
  filePath: string,
  outputPath: string,
  songConfig?: { name?: string; fileTypes?: string[] }
) {
  console.log(chalk.cyan("\nGenerating SONG schema..."));

  try {
    // Validate file exists
    const fileValid = await validations.validateFile(filePath);
    if (!fileValid) {
      console.error(chalk.red(`Error: Invalid file ${filePath}`));
      return;
    }

    ensureDirectoryExists(path.dirname(outputPath));

    // Read and parse the JSON file
    const fileContent = fs.readFileSync(filePath, "utf-8");
    let sampleData: Record<string, any>;

    try {
      sampleData = JSON.parse(fileContent);
    } catch (error) {
      console.error(chalk.red("Error: Invalid JSON file"));
      return;
    }

    // Validate the JSON structure
    if (!sampleData || !sampleData.experiment) {
      console.error(chalk.red("Error: JSON must contain an experiment object"));
      return;
    }

    // Generate SONG schema with provided configuration
    const schemaName =
      songConfig?.name || path.basename(filePath, path.extname(filePath));
    const songOptions = songConfig?.fileTypes
      ? { fileTypes: songConfig.fileTypes }
      : undefined;

    const songSchema = generateSongSchema(sampleData, schemaName, songOptions);

    // Validate the generated schema
    const isValid = validateSongSchema(songSchema);
    if (!isValid) {
      console.error(chalk.red("Error: Generated schema validation failed"));
      return;
    }

    // Write schema to output file
    fs.writeFileSync(outputPath, JSON.stringify(songSchema, null, 2));
    console.log(chalk.green(`✓ Song schema saved to ${outputPath}`));
    console.log(
      chalk.white(
        `Tip: enums and required fields are not inferred, make sure to update your schema accordingly`
      )
    );
  } catch (error) {
    console.error(chalk.red("Error generating SONG schema:"), error);
    throw error;
  }
}

async function handleDictionaryMode(
  filePaths: string[],
  dictionaryConfig: { name: string; description: string; version: string },
  delimiter: string,
  outputPath: string
) {
  console.log(chalk.cyan("\nGenerating Lectern dictionary..."));

  ensureDirectoryExists(path.dirname(outputPath));

  const dictionary = generateDictionary(
    dictionaryConfig.name,
    dictionaryConfig.description,
    dictionaryConfig.version
  );

  for (const filePath of filePaths) {
    try {
      const fileContent = fs.readFileSync(filePath, "utf-8");
      const [headerLine, sampleLine] = fileContent.split("\n");

      if (!headerLine) {
        console.error(
          chalk.red(`Error: CSV file ${filePath} is empty or has no headers`)
        );
        continue;
      }

      const headers = parseCSVLine(headerLine, delimiter, true)[0];
      if (!headers) {
        console.error(
          chalk.red(`Error: Failed to parse CSV headers in ${filePath}`)
        );
        continue;
      }

      // Get schema name from file name
      const schemaName = path
        .basename(filePath, path.extname(filePath))
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "_");

      // Get sample data
      const sampleData: Record<string, string> = {};
      if (sampleLine) {
        const sampleValues = parseCSVLine(sampleLine, delimiter, false)[0];
        if (sampleValues) {
          headers.forEach((header: string, index: number) => {
            sampleData[header] = sampleValues[index] || "";
          });
        }
      }

      const schema = generateSchema(schemaName, headers, sampleData);
      dictionary.schemas.push(schema);
      console.log(chalk.green(`✓ Generated schema for ${schemaName}`));
    } catch (error) {
      console.error(chalk.red(`Error processing ${filePath}:`), error);
    }
  }

  fs.writeFileSync(outputPath, JSON.stringify(dictionary, null, 2));
  console.log(chalk.green(`\n✓ Dictionary saved to ${outputPath}`));
}

async function handleElasticsearchMappingProfile(cliOutput: CLIOutput) {
  const { filePaths, outputPath, config } = cliOutput;

  if (!outputPath) {
    console.error(
      chalk.red("Error: Output path is required for mapping generation")
    );
    process.exit(1);
  }

  const filePath = filePaths[0];
  const fileExtension = path.extname(filePath).toLowerCase();

  console.log(chalk.cyan("\nGenerating Elasticsearch Mapping..."));

  try {
    let mapping;
    switch (fileExtension) {
      case ".csv":
        // Validate CSV headers first
        const csvHeadersValid = await validateCSVHeaders(
          filePath,
          config.delimiter
        );
        if (!csvHeadersValid) {
          console.error(
            chalk.red(`Error: CSV file ${filePath} has invalid headers`)
          );
          process.exit(1);
        }

        // Read the CSV file
        const fileContent = fs.readFileSync(filePath, "utf-8");
        const [headerLine, sampleLine] = fileContent.split("\n");

        // Parse headers and sample data
        const headers = parseCSVLine(headerLine, config.delimiter, true)[0];
        const sampleValues = parseCSVLine(
          sampleLine,
          config.delimiter,
          false
        )[0];

        // Create sample data object
        const sampleData: Record<string, string> = {};
        headers.forEach((header: string, index: number) => {
          sampleData[header] = sampleValues[index] || "";
        });

        mapping = generateMappingFromCSV(headers, sampleData);
        break;

      case ".json":
        mapping = generateMappingFromJson(filePath);
        break;

      default:
        console.error(
          chalk.red(
            `Unsupported file type: ${fileExtension}. Use .csv or .json`
          )
        );
        process.exit(1);
    }

    // Ensure output directory exists
    ensureDirectoryExists(path.dirname(outputPath));

    // Write mapping to output file
    fs.writeFileSync(outputPath, JSON.stringify(mapping, null, 2));
    console.log(chalk.green(`✓ Elasticsearch mapping saved to ${outputPath}`));
  } catch (error) {
    console.error(chalk.red("Error generating Elasticsearch mapping:"), error);
    process.exit(1);
  }

  async function handleArrangerConfigsProfile(cliOutput: CLIOutput) {
    const { filePaths, config, arrangerConfigDir } = cliOutput;

    if (!arrangerConfigDir) {
      throw new Error("Arranger config directory is required");
    }

    // Validate input is a JSON mapping file
    const fileExtension = path.extname(filePaths[0]).toLowerCase();
    if (fileExtension !== ".json") {
      console.error(
        chalk.red("Error: Arranger configs require a JSON mapping file")
      );
      process.exit(1);
    }

    // Read the existing mapping file
    try {
      const mappingContent = fs.readFileSync(filePaths[0], "utf-8");
      const mapping = JSON.parse(mappingContent);

      generateArrangerConfigs(mapping, config.elasticsearch.index);
    } catch (error) {
      console.error(chalk.red("Error reading mapping file:"), error);
      process.exit(1);
    }
  }

  async function handleConfigsProfile(cliOutput: CLIOutput) {
    // Validate that we have both CSV and JSON files
    const csvFiles = cliOutput.filePaths.filter(
      (filePath) => path.extname(filePath).toLowerCase() === ".csv"
    );
    const jsonFiles = cliOutput.filePaths.filter(
      (filePath) => path.extname(filePath).toLowerCase() === ".json"
    );

    if (csvFiles.length === 0 || jsonFiles.length === 0) {
      console.error(
        chalk.red(
          "Error: generateConfigs requires both CSV and JSON input files"
        )
      );
      process.exit(1);
    }

    // Generate mapping output path if not provided
    const mappingOutputPath = cliOutput.outputPath
      ? path.join(cliOutput.outputPath, "mapping.json")
      : path.join(process.cwd(), "mapping.json");

    // Ensure each profile handler gets the appropriate file
    const songSchemaConfig: CLIOutput = {
      ...cliOutput,
      filePaths: jsonFiles,
      profile: "songSchema",
      outputPath: path.join(
        cliOutput.outputPath || process.cwd(),
        "schema.json"
      ),
    };

    const dictionaryConfig: CLIOutput = {
      ...cliOutput,
      filePaths: csvFiles,
      profile: "generateLecternDictionary",
      outputPath: path.join(
        cliOutput.outputPath || process.cwd(),
        "dictionary.json"
      ),
    };

    const mappingConfig: CLIOutput = {
      ...cliOutput,
      filePaths: csvFiles,
      profile: "generateElasticSearchMapping",
      outputPath: mappingOutputPath,
    };

    const arrangerConfig: CLIOutput = {
      ...cliOutput,
      filePaths: [mappingOutputPath],
      profile: "generateArrangerConfigs",
      outputPath:
        cliOutput.arrangerConfigDir ||
        path.join(process.cwd(), "arranger-configs"),
    };

    // Execute profiles in sequence
    await handleSongSchemaProfile(songSchemaConfig);
    await handleLecternDictionaryProfile(dictionaryConfig);
    await handleElasticsearchMappingProfile(mappingConfig);
    await handleArrangerConfigsProfile(arrangerConfig);
  }
  async function handleSongSchemaProfile(cliOutput: CLIOutput) {
    // Ensure filePaths is not empty and first path is a string
    const filePath = cliOutput.filePaths[0];
    const fileExtension = path.extname(filePath).toLowerCase();

    if (fileExtension !== ".json") {
      console.error(
        chalk.red("Error: Song schema generation requires a JSON input file")
      );
      process.exit(1);
    }

    await handleSongMode(
      filePath,
      cliOutput.outputPath || "",
      cliOutput.songConfig
    );
  }

  async function handleLecternDictionaryProfile(cliOutput: CLIOutput) {
    // Validate all input files are CSVs
    const invalidFiles = cliOutput.filePaths.filter(
      (filePath) => path.extname(filePath).toLowerCase() !== ".csv"
    );

    if (invalidFiles.length > 0) {
      console.error(
        chalk.red(
          "Error: Lectern dictionary generation requires CSV input files"
        )
      );
      console.error(chalk.red("Invalid files:", invalidFiles.join(", ")));
      process.exit(1);
    }

    if (!cliOutput.dictionaryConfig) {
      throw new Error("Dictionary configuration is required");
    }

    await handleDictionaryMode(
      cliOutput.filePaths,
      cliOutput.dictionaryConfig,
      cliOutput.config.delimiter,
      cliOutput.outputPath || ""
    );
  }

  // Main function
  async function main() {
    try {
      const cliOutput = await setupCLI();
      console.log(
        chalk.blue("\n=============================================")
      );
      console.log(chalk.bold.blue("      Composer Starting... 🚀"));
      console.log(
        chalk.blue("=============================================\n")
      );

      if (!cliOutput.filePaths || cliOutput.filePaths.length === 0) {
        console.error(
          chalk.red(
            "Error: No input files specified. Please provide input files."
          )
        );
        process.exit(1);
      }

      // Handle different profiles
      switch (cliOutput.profile) {
        case Profiles.GENERATE_ELASTICSEARCH_MAPPING:
          await handleElasticsearchMappingProfile(cliOutput);
          break;

        case Profiles.SONG_SCHEMA:
          await handleSongSchemaProfile(cliOutput);
          break;

        case Profiles.GENERATE_LECTERN_DICTIONARY:
          await handleLecternDictionaryProfile(cliOutput);
          break;

        case Profiles.GENERATE_ARRANGER_CONFIGS:
          await handleArrangerConfigsProfile(cliOutput);
          break;

        case Profiles.GENERATE_CONFIGS:
          await handleConfigsProfile(cliOutput);
          break;

        default:
          console.error(chalk.red("Error: Unknown profile"));
          process.exit(1);
      }
    } catch (error) {
      console.error(chalk.red("Error occurred:"), error);
      process.exit(1);
    }
  }

  main();
}
