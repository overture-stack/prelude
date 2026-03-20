import { Command } from "commander";
import { DEFAULTS } from "../config/defaults";
import { Logger } from "../utils/logger";

export function configureCommandOptions(program: Command): void {
  program
    .version("1.1.0")
    .description("Conductor: Data Processing Pipeline")
    .option("--debug", "Enable debug mode")
    .helpOption(false)
    .option("-h, --help", "display help for command")
    .on("option:help", () => {
      Logger.showReferenceCommands();
      process.exit(0);
    });

  const esHostDefault = `${DEFAULTS.ES_HOST}:${DEFAULTS.ES_PORT}`;
  const dbHostDefault = `${DEFAULTS.DB_HOST}:${DEFAULTS.DB_PORT}`;
  const batchDefault = String(DEFAULTS.BATCH_SIZE);

  program
    .command("upload")
    .description("Complete workflow: CSV → PostgreSQL → Elasticsearch")
    .option("-f, --file <files...>", "Input files to process")
    .option("-t, --table <name>", "Database table name")
    .option("-i, --index <name>", "Elasticsearch index name")
    .option("-b, --batch-size <size>", "Batch size for operations", batchDefault)
    .option("--delimiter <char>", "CSV delimiter character", DEFAULTS.DELIMITER)
    .option("--db-host <host>", "PostgreSQL host:port", dbHostDefault)
    .option("--db-name <name>", "PostgreSQL database name", DEFAULTS.DB_NAME)
    .option("--db-user <user>", "PostgreSQL username", DEFAULTS.DB_USER)
    .option("--db-pass <password>", "PostgreSQL password", DEFAULTS.DB_PASSWORD)
    .option("--es-host <host>", "Elasticsearch host:port", esHostDefault)
    .option("--es-user <username>", "Elasticsearch username", DEFAULTS.ES_USER)
    .option("--es-pass <password>", "Elasticsearch password", DEFAULTS.ES_PASSWORD)
    .action(() => { /* Handled by main.ts */ });

  program
    .command("upload-es")
    .description("Upload CSV data directly to Elasticsearch")
    .option("-f, --file <files...>", "Input files to process")
    .option("-i, --index <name>", "Elasticsearch index name")
    .option("-b, --batch-size <size>", "Batch size for uploads", batchDefault)
    .option("--delimiter <char>", "CSV delimiter character", DEFAULTS.DELIMITER)
    .option("--es-host <host>", "Elasticsearch host:port", esHostDefault)
    .option("--es-user <username>", "Elasticsearch username", DEFAULTS.ES_USER)
    .option("--es-pass <password>", "Elasticsearch password", DEFAULTS.ES_PASSWORD)
    .action(() => { /* Handled by main.ts */ });

  program
    .command("upload-db")
    .description("Upload CSV data to PostgreSQL database")
    .option("-f, --file <files...>", "Input files to process")
    .option("-t, --table <name>", "Database table name")
    .option("-b, --batch-size <size>", "Batch size for uploads", batchDefault)
    .option("--delimiter <char>", "CSV delimiter character", DEFAULTS.DELIMITER)
    .option("--db-host <host>", "PostgreSQL host:port", dbHostDefault)
    .option("--db-name <name>", "PostgreSQL database name", DEFAULTS.DB_NAME)
    .option("--db-user <user>", "PostgreSQL username", DEFAULTS.DB_USER)
    .option("--db-pass <password>", "PostgreSQL password", DEFAULTS.DB_PASSWORD)
    .action(() => { /* Handled by main.ts */ });

  program
    .command("index-db")
    .description("Index PostgreSQL table data to Elasticsearch")
    .option("-t, --table <name>", "Database table name")
    .option("-i, --index <name>", "Elasticsearch index name")
    .option("-b, --batch-size <size>", "Batch size for operations", batchDefault)
    .option("--db-host <host>", "PostgreSQL host:port", dbHostDefault)
    .option("--db-name <name>", "PostgreSQL database name", DEFAULTS.DB_NAME)
    .option("--db-user <user>", "PostgreSQL username", DEFAULTS.DB_USER)
    .option("--db-pass <password>", "PostgreSQL password", DEFAULTS.DB_PASSWORD)
    .option("--es-host <host>", "Elasticsearch host:port", esHostDefault)
    .option("--es-user <username>", "Elasticsearch username", DEFAULTS.ES_USER)
    .option("--es-pass <password>", "Elasticsearch password", DEFAULTS.ES_PASSWORD)
    .action(() => { /* Handled by main.ts */ });
}
