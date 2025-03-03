/**
 * CLI Options Module
 *
 * This module configures the command-line options for the Conductor CLI.
 * It sets up the available commands, their options, and handles parsing arguments.
 */

import { Command } from "commander";
import { Profiles } from "../types/constants";
import { CLIOutput } from "../types/cli";
import { Logger } from "../utils/logger";

/**
 * Configures the command-line options for the Conductor CLI
 *
 * @param program - The Commander.js program instance
 */
export function configureCommandOptions(program: Command): void {
  // Global options
  program
    .version("1.0.0")
    .description("Conductor: Data Processing Pipeline")
    .option("-d, --debug", "Enable debug mode");

  // Upload command
  program
    .command("upload")
    .description("Upload data to Elasticsearch")
    .option("-f, --file <files...>", "Input files to process")
    .option("-i, --index <name>", "Elasticsearch index name")
    .option("-b, --batch-size <size>", "Batch size for uploads")
    .option("-d, --delimiter <char>", "CSV delimiter character")
    .option("-o, --output <path>", "Output directory for generated files")
    .option("--force", "Force overwrite of existing files")
    .option("--url <url>", "Elasticsearch URL")
    .option("--user <username>", "Elasticsearch username", "elastic")
    .option(
      "--password <password>",
      "Elasticsearch password",
      "myelasticpassword"
    )
    .action(() => {
      /* Handled by main.ts */
    });

  // Setup indices command
  program
    .command("indexManagement")
    .description("Set up Elasticsearch indices and templates")
    .option("-t, --template-file <path>", "Template JSON file")
    .option("-n, --template-name <name>", "Template name")
    .option("-i, --index-name <name>", "Index name")
    .option("-a, --alias-name <name>", "Alias name")
    .option("-o, --output <path>", "Output directory for generated files")
    .option("--force", "Force overwrite of existing files")
    .option("--url <url>", "Elasticsearch URL")
    .option("--user <username>", "Elasticsearch username", "elastic")
    .option(
      "--password <password>",
      "Elasticsearch password",
      "myelasticpassword"
    )
    .action(() => {
      /* Handled by main.ts */
    });

  // Lectern schema upload command
  program
    .command("lecternUpload")
    .description("Upload schema to Lectern server")
    .option("-s, --schema-file <path>", "Schema JSON file to upload")
    .option(
      "-u, --lectern-url <url>",
      "Lectern server URL",
      "http://localhost:3031"
    )
    .option("-t, --auth-token <token>", "Authentication token", "")
    .option("-o, --output <path>", "Output directory for response logs")
    .option("--force", "Force overwrite of existing files")
    .action(() => {
      /* Handled by main.ts */
    });
}

/**
 * Parses command-line arguments into a standardized CLIOutput object
 *
 * @param options - Parsed command-line options
 * @returns A CLIOutput object for command execution
 */
export function parseCommandLineArgs(options: any): CLIOutput {
  // Determine the profile from options
  let profile = options.profile || Profiles.UPLOAD;

  // Parse file paths
  const filePaths = Array.isArray(options.file)
    ? options.file
    : options.file
    ? [options.file]
    : [];

  // Add template file to filePaths if present
  if (options.templateFile && !filePaths.includes(options.templateFile)) {
    filePaths.push(options.templateFile);
  }

  // Add schema file to filePaths if present for Lectern upload
  if (options.schemaFile && !filePaths.includes(options.schemaFile)) {
    filePaths.push(options.schemaFile);
  }

  Logger.debug(`Parsed profile: ${profile}`);
  Logger.debug(`Parsed file paths: ${filePaths.join(", ")}`);

  // Create config object with support for Lectern-specific configurations
  const config = {
    elasticsearch: {
      url:
        options.url || process.env.ELASTICSEARCH_URL || "http://localhost:9200",
      user: options.user || process.env.ELASTICSEARCH_USER,
      password: options.password || process.env.ELASTICSEARCH_PASSWORD,
      index: options.index || options.indexName || "conductor-data",
      templateFile: options.templateFile,
      templateName: options.templateName,
      alias: options.aliasName,
    },
    lectern: {
      url: options.lecternUrl || "http://localhost:3031",
      authToken: options.authToken || "",
    },
    batchSize: options.batchSize ? parseInt(options.batchSize, 10) : 1000,
    delimiter: options.delimiter || ",",
  };

  // Build the standardized CLI output
  return {
    profile,
    filePaths,
    outputPath: options.output,
    config,
    options,
    envConfig: {
      elasticsearchUrl: config.elasticsearch.url,
      esUser: config.elasticsearch.user,
      esPassword: config.elasticsearch.password,
      indexName: config.elasticsearch.index,
      lecternUrl: config.lectern.url,
    },
  };
}
