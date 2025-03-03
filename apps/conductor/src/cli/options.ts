/**
 * CLI Options Module
 *
 * This module defines and configures command-line options for the Conductor CLI
 * using the Commander.js library. It also handles parsing of these options into
 * a standardized CLIOutput format.
 */

import { Command } from "commander";
import { Config } from "../types/cli";
import { CLIOutput } from "./index";
import { Logger } from "../utils/logger";

/**
 * Configures command-line options for the Conductor CLI.
 *
 * @param program The Commander.js program instance to configure
 */
export function configureCommandOptions(program: Command): void {
  program.version("1.0.0").description("Conductor: Data Processing Pipeline");

  // Upload command
  const uploadCommand = program
    .command("upload")
    .description("Upload CSV files to Elasticsearch")
    .option("-f, --files <files...>", "Input CSV files to process")
    .option("-d, --delimiter <delimiter>", "CSV delimiter", ",")
    .option("-b, --batch-size <size>", "Batch size for uploads", "1000")
    .option("-u, --url <url>", "Elasticsearch URL (overrides env config)")
    .option("-i, --index <index>", "Elasticsearch index name")
    .option("--username <username>", "Elasticsearch username", "elastic")
    .option(
      "--password <password>",
      "Elasticsearch password",
      "myelasticpassword"
    )
    .option("--force", "Force operation without confirmation", false)
    .option("-o, --output <path>", "Output directory for results")
    .option("--debug", "Enable debug logging", false);

  // Index Management command
  const indexManagementCommand = program
    .command("indexManagement")
    .description("Manage Elasticsearch indices and templates")
    .option("-t, --template-file <file>", "Template configuration file")
    .option("-n, --template-name <name>", "Template name")
    .option("-i, --index-name <name>", "Index name to create")
    .option("-a, --alias <name>", "Alias name for the index")
    .option("-u, --url <url>", "Elasticsearch URL (overrides env config)")
    .option("--username <username>", "Elasticsearch username", "elastic")
    .option(
      "--password <password>",
      "Elasticsearch password",
      "myelasticpassword"
    )
    .option("--force", "Force operation without confirmation", false)
    .option("-o, --output <path>", "Output directory for results")
    .option("--debug", "Enable debug logging", false);
}

/**
 * Parses command-line arguments and options into a standardized CLIOutput object.
 *
 * @param options The parsed command-line options from Commander.js
 * @returns A standardized CLIOutput object for command execution
 */
export function parseCommandLineArgs(options: any): CLIOutput {
  Logger.debug("Parsing command-line arguments", options);

  // Handle file paths
  let filePaths: string[] = [];
  if (options.files) {
    filePaths = Array.isArray(options.files) ? options.files : [options.files];
  } else if (options.templateFile) {
    filePaths = [options.templateFile];
  }

  // Create configuration object
  const config: Config = {
    delimiter: options.delimiter || ",",
    batchSize: parseInt(options.batchSize || "1000", 10),
    elasticsearch: {
      url: options.url,
      index: options.index || options.indexName, // Support both formats
      templateName: options.templateName,
      alias: options.alias,
      user: options.username, // Added username
      password: options.password, // Added password
    },
  };

  // Construct and return the CLI output
  return {
    config,
    filePaths,
    profile: options.profile,
    outputPath: options.output,
    envConfig: {},
    options,
    debug: options.debug || false,
  };
}
