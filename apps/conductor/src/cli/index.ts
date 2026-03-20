import { Command } from "commander";
import { Config, CLIOutput } from "../types/cli";
import { Profiles } from "../types/constants";
import { configureCommandOptions } from "./options";
import { parseHostPort, validateDelimiter } from "../validations/utils";
import { DEFAULTS } from "../config/defaults";
import { Logger } from "../utils/logger";
import { ConductorError, ErrorFactory } from "../utils/errors";

type Profile = (typeof Profiles)[keyof typeof Profiles];

const VALID_PROFILES = new Set<string>(Object.values(Profiles));

export async function setupCLI(): Promise<CLIOutput> {
  const program = new Command();

  try {
    Logger.debug`Conductor CLI`;

    configureCommandOptions(program);

    Logger.debug`Raw arguments: ${process.argv.join(" ")}`;
    program.parse(process.argv);

    const commandName = program.args[0];

    if (!commandName) {
      throw ErrorFactory.args("No command specified", [
        "Specify a command to run",
        "Use 'conductor --help' to see available commands",
        "Example: conductor upload -f data.csv",
      ]);
    }

    const command = program.commands.find((cmd) => cmd.name() === commandName);

    if (!command || !VALID_PROFILES.has(commandName)) {
      throw ErrorFactory.args(`Unknown command: ${commandName}`, [
        "Use 'conductor --help' to see available commands",
        "Check the command spelling",
      ]);
    }

    const options = command.opts();
    Logger.debug`Parsed options: ${JSON.stringify(options, null, 2)}`;

    const profile = commandName as Profile;

    // Parse file paths
    let filePaths: string[] = [];
    if (Array.isArray(options.file)) {
      filePaths = options.file as string[];
    } else if (options.file) {
      filePaths = [options.file as string];
    }

    // Validate batch size
    const batchSize = options.batchSize
      ? parseInt(options.batchSize as string, 10)
      : DEFAULTS.BATCH_SIZE;
    if (isNaN(batchSize) || batchSize <= 0) {
      throw ErrorFactory.validation(
        "Invalid batch size",
        { batchSize: options.batchSize },
        ["Batch size must be a positive number", "Example: --batch-size 1000"]
      );
    }

    // Validate delimiter if provided
    if (options.delimiter) {
      validateDelimiter(options.delimiter as string);
    }

    const config = buildConfig(options, batchSize);

    Logger.debug`CLI setup completed successfully`;

    return {
      profile,
      debug: options.debug as boolean | undefined,
      filePaths,
      config,
      options,
    };
  } catch (error) {
    if (error instanceof ConductorError) {
      throw error;
    }

    throw ErrorFactory.args("CLI setup failed", [
      "Check command line arguments",
      "Use --help for usage information",
      "Use --debug for detailed error information",
    ]);
  }
}

function buildConfig(options: Record<string, unknown>, batchSize: number): Config {
  const esHostPort = parseHostPort(
    (options.esHost as string) || process.env.ES_HOST || `${DEFAULTS.ES_HOST}:${DEFAULTS.ES_PORT}`,
    String(DEFAULTS.ES_PORT)
  );

  const esUrl =
    esHostPort.port === 443 || esHostPort.port === 9243
      ? `https://${esHostPort.host}:${esHostPort.port}`
      : `http://${esHostPort.host}:${esHostPort.port}`;

  const dbHostPort = parseHostPort(
    (options.dbHost as string) || process.env.DB_HOST || `${DEFAULTS.DB_HOST}:${DEFAULTS.DB_PORT}`,
    String(DEFAULTS.DB_PORT)
  );

  return {
    elasticsearch: {
      url: process.env.ELASTICSEARCH_URL || esUrl,
      user:
        (options.esUser as string) ||
        (options.user as string) ||
        process.env.ELASTICSEARCH_USER ||
        DEFAULTS.ES_USER,
      password:
        (options.esPass as string) ||
        (options.password as string) ||
        process.env.ELASTICSEARCH_PASSWORD ||
        DEFAULTS.ES_PASSWORD,
      index: (options.index as string) || (options.indexName as string) || DEFAULTS.ES_INDEX,
    },
    postgresql: {
      host: dbHostPort.host,
      port: dbHostPort.port,
      database:
        (options.dbName as string) ||
        (options.pgDatabase as string) ||
        process.env.POSTGRES_DATABASE ||
        DEFAULTS.DB_NAME,
      user:
        (options.dbUser as string) ||
        (options.pgUsername as string) ||
        process.env.POSTGRES_USERNAME ||
        DEFAULTS.DB_USER,
      password:
        (options.dbPass as string) ||
        (options.pgPassword as string) ||
        process.env.POSTGRES_PASSWORD ||
        DEFAULTS.DB_PASSWORD,
      table:
        (options.table as string) ||
        (options.pgTable as string) ||
        process.env.POSTGRES_TABLE ||
        DEFAULTS.DB_TABLE,
      addMetadata: true,
    },
    batchSize,
    delimiter: (options.delimiter as string) || DEFAULTS.DELIMITER,
  };
}
