import { Command } from "commander";
import * as path from "path";
import { Profile, CLIMode, CLIOutput, EnvConfig } from "../types";
import {
  validateEnvironment,
  validateDependencies,
} from "../services/validations";
import chalk from "chalk";
export { Profile, CLIMode };

function loadEnvironmentConfig(): EnvConfig {
  return {
    composerPath: process.env.COMPOSER_PATH || "/composer",
    dataFile: process.env.TABULAR_DATA_FILE,
    indexName: process.env.TABULAR_INDEX_NAME,
    fileMetadataSample:
      process.env.FILE_METADATA_SAMPLE || "/data/sampleData/fileMetadata.json",
    tabularSample: process.env.TABULAR_SAMPLE || "/data/tabularData.csv",
    lyricUploadDirectory:
      process.env.LYRIC_UPLOAD_DIRECTORY || "/data/lyricUploads/",
    songUploadDirectory:
      process.env.SONG_UPLOAD_DIRECTORY || "/data/songUploads/",
    defaultStudyId: process.env.DEFAULT_STUDY_ID || "demo",
    songSchema: process.env.SONG_SCHEMA || "/configs/songSchema",
    lecternDictionary:
      process.env.LECTERN_DICTIONARY || "/configs/lecternDictionaries",
    esConfigDir: process.env.ES_CONFIG_DIR || "/configs/elasticsearchConfigs",
    arrangerConfigDir:
      process.env.ARRANGER_CONFIG_DIR || "/configs/arrangerConfigs",
  };
}

export async function setupCLI(): Promise<CLIOutput> {
  const program = new Command();

  // Load environment configuration
  const envConfig = loadEnvironmentConfig();

  // Validate environment and dependencies
  const isEnvironmentValid = await validateEnvironment({
    composerPath: envConfig.composerPath,
    dataFile: envConfig.dataFile,
    esConfigDir: envConfig.esConfigDir,
    arrangerConfigDir: envConfig.arrangerConfigDir,
    lecternDictionary: envConfig.lecternDictionary,
    songSchema: envConfig.songSchema,
  });

  if (!isEnvironmentValid) {
    console.error(chalk.red("Environment validation failed. Exiting..."));
    process.exit(1);
  }

  const areDependenciesValid = await validateDependencies(
    envConfig.composerPath
  );
  if (!areDependenciesValid) {
    console.error(chalk.red("Dependencies validation failed. Exiting..."));
    process.exit(1);
  }

  program
    .name("composer")
    .description("Process files into Dictionary, Song Schema, or Elasticsearch")
    .option(
      "-p, --profile <profile>",
      "Execution profile",
      "default" as Profile
    )
    .requiredOption(
      "-f, --files <paths...>",
      "Input file paths (CSV or JSON, space separated)"
    )
    .option("-i, --index <name>", "Elasticsearch index name", "tabular-index")
    .option(
      "-o, --output <file>",
      "Output file path for generated schemas or mapping"
    )
    .option(
      "--arranger-config-dir <path>",
      "Directory for Arranger configurations"
    )
    .option("-n, --name <name>", "Dictionary/Schema name")
    .option(
      "-d, --description <text>",
      "Dictionary description",
      "Generated dictionary from CSV files"
    )
    .option("-v, --version <version>", "Dictionary version", "1.0.0")
    .option("--file-types <types...>", "Allowed file types for Song schema")
    .option("--delimiter <char>", "CSV delimiter", ",");

  program.parse();
  const options = program.opts();

  // Map profile to mode if not explicitly set
  if (!options.mode) {
    switch (options.profile as Profile) {
      case "songSchema":
        options.mode = "song";
        break;
      case "generateLecternDictionary":
        options.mode = "dictionary";
        break;
      case "generateElasticSearchMapping":
        options.mode = "mapping";
        break;
      case "generateArrangerConfigs":
        options.mode = "arranger";
        break;
      case "generateConfigs":
        options.mode = "all";
        break;
      default:
        throw new Error("Invalid profile");
    }
  }

  // Set default output paths based on profile
  if (!options.output) {
    switch (options.profile as Profile) {
      case "songSchema":
        options.output = path.join(envConfig.songSchema || "", "schema.json");
        break;
      case "generateLecternDictionary":
        options.output = path.join(
          envConfig.lecternDictionary || "",
          "dictionary.json"
        );
        break;
      case "generateElasticSearchMapping":
        options.output = path.join(envConfig.esConfigDir || "", "mapping.json");
        break;
      case "generateArrangerConfigs":
        options.arrangerConfigDir = envConfig.arrangerConfigDir;
        options.output = path.join(
          envConfig.arrangerConfigDir || "",
          "mapping.json"
        );
        break;
      case "generateConfigs":
        options.arrangerConfigDir = envConfig.arrangerConfigDir;
        options.output = envConfig.esConfigDir;
        break;
    }
  }

  return {
    config: {
      elasticsearch: {
        index: options.index || envConfig.indexName || "your_index_name",
      },
      batchSize: options.batchSize || 1000,
      delimiter: options.delimiter || ",",
    },
    profile: options.profile as Profile,
    filePaths: options.files,
    outputPath: options.output,
    mode: options.mode as CLIMode,
    envConfig,
    arrangerConfigDir: options.arrangerConfigDir || envConfig.arrangerConfigDir,
    dictionaryConfig:
      options.mode === "dictionary"
        ? {
            name: options.name,
            description: options.description,
            version: options.version,
          }
        : undefined,
    songConfig:
      options.mode === "song"
        ? {
            name: options.name,
            fileTypes: options.fileTypes,
          }
        : undefined,
  };
}
