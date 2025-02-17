import { Command } from "commander";
import { Config } from "../types";

type CLIMode = "upload";

interface CLIOutput {
  config: Config;
  filePaths: string[];
  mode: CLIMode;
}

export function setupCLI(): CLIOutput {
  const program = new Command();

  // Configure the CLI application for upload mode only.
  program
    .name("conductor")
    .description("Upload CSV files to Elasticsearch")
    .requiredOption(
      "-f, --files <paths...>",
      "Input CSV file paths (space separated)"
    )
    .option("-i, --index <name>", "Elasticsearch index name", "tabular-index")
    .option("--url <url>", "Elasticsearch URL", "http://localhost:9200")
    .option("-u, --user <username>", "Elasticsearch username", "elastic")
    .option(
      "-p, --password <password>",
      "Elasticsearch password",
      "myelasticpassword"
    )
    .option("-b, --batch-size <size>", "Batch size for processing", "1000")
    .option("--delimiter <char>", "CSV delimiter", ",");

  program.parse();
  const options = program.opts();

  // Build the Config object.
  const config: Config = {
    elasticsearch: {
      url: options.url,
      index: options.index,
      user: options.user,
      password: options.password,
    },
    batchSize: parseInt(options.batchSize, 10),
    delimiter: options.delimiter,
  };

  return {
    config,
    filePaths: options.files,
    mode: "upload",
  };
}
