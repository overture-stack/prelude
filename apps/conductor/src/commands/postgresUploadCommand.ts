// src/commands/postgresUploadCommand.ts
/**
 * PostgreSQL Upload Command - CLEAN & FOCUSED
 *
 * Handles uploading CSV data to PostgreSQL tables.
 * Uses shared base class and connection management for simplicity.
 * FIXED: Correct connection manager usage
 */

import { DataUploadCommand } from "./dataUploadCommand";
import { CLIOutput } from "../types/cli";
import { Logger } from "../utils/logger";
import { ErrorFactory } from "../utils/errors";
import { ConnectionManager } from "../services/connectionManager";
import {
  createPostgresClient,
  validateConnection,
} from "../services/postgresql";
import { processCSVFileForPostgres } from "../services/csvProcessor/postgresProcessor";

export class PostgresUploadCommand extends DataUploadCommand {
  constructor() {
    super("postgresUpload");
  }

  /**
   * Validates PostgreSQL-specific configuration
   */
  protected async validateSpecific(cliOutput: CLIOutput): Promise<void> {
    const { config } = cliOutput;

    // Check PostgreSQL configuration
    if (!config.postgresql) {
      throw ErrorFactory.args("PostgreSQL configuration is required", [
        "Provide PostgreSQL connection details",
        "Example: --host localhost --database mydb --table mytable",
      ]);
    }

    if (!config.postgresql.table) {
      throw ErrorFactory.args("PostgreSQL table name is required", [
        "Use -t <tableName> to specify the target table",
        "Example: --table users",
      ]);
    }
  }

  /**
   * Processes a single CSV file to PostgreSQL
   * Uses connection manager for reliable cleanup
   */
  protected async processFile(filePath: string, config: any): Promise<void> {
    const connManager = new ConnectionManager();

    try {
      // Create PostgreSQL client
      const client = createPostgresClient(config);

      // Register for cleanup (connection manager expects objects with end() method)
      connManager.register(client, "PostgreSQL");

      // Validate connection and table
      await validateConnection(client);
      await this.validateTable(client, config.postgresql.table);

      // Process the CSV file
      await processCSVFileForPostgres(filePath, config, client);
    } catch (error) {
      // Re-throw ConductorErrors as-is (they have proper formatting)
      if (error instanceof Error && error.name === "ConductorError") {
        throw error;
      }

      // Wrap other errors with context
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw ErrorFactory.validation(
        `PostgreSQL upload failed: ${errorMessage}`,
        { filePath, tableName: config.postgresql.table, originalError: error },
        [
          "Check PostgreSQL connection and credentials",
          "Verify table permissions and schema",
          "Review CSV file format and encoding",
        ]
      );
    } finally {
      // Always clean up connections
      await connManager.closeAll();
    }
  }

  /**
   * Validates that the target table exists or can be created
   */
  private async validateTable(client: any, tableName: string): Promise<void> {
    try {
      Logger.debug`Validating table: ${tableName}`;

      const result = await client.query(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_name = $1
        )`,
        [tableName]
      );

      const tableExists = result.rows[0]?.exists;

      if (!tableExists) {
        Logger.debug`Table ${tableName} does not exist - will be created during upload`;
      } else {
        Logger.debug`Table ${tableName} exists and is accessible`;
      }
    } catch (error) {
      throw ErrorFactory.validation(
        "Failed to validate PostgreSQL table",
        { tableName, originalError: error },
        [
          "Check PostgreSQL connection and availability",
          "Verify you have access to the database schema",
          "Ensure PostgreSQL service is running",
        ]
      );
    }
  }
}
