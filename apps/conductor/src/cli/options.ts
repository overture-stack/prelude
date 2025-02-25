/**
 * Command Options Configuration
 *
 * Configures the CLI command options for Conductor
 */

import { Command } from "commander";
import { Logger } from "../utils/logger";

export function configureCommandOptions(program: Command): void {
  program
    .name("conductor")
    .description("Upload CSV files to Elasticsearch")
    .requiredOption(
      "-f, --files <paths...>",
      "Input CSV file paths (space separated)"
    )
    .option("-i, --index <name>", "Elasticsearch index name")
    .option("-o, --output <path>", "Output path for logs or results")
    .option("--url <url>", "Elasticsearch URL")
    .option("-u, --user <username>", "Elasticsearch username")
    .option("-p, --password <password>", "Elasticsearch password")
    .option("-b, --batch-size <size>", "Batch size for processing")
    .option("--delimiter <char>", "CSV delimiter")
    .option("--debug", "Enable debug mode")
    .helpOption("-h, --help", "Display help for command")
    .addHelpText("after", () => {
      Logger.showReferenceCommands();
      return ""; // Return empty string since we handle the formatting in showReferenceCommands
    });
}
