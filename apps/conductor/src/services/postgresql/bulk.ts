// src/services/postgresql/bulk.ts
/**
 * PostgreSQL Bulk Operations Module
 *
 * Provides functions for bulk insert operations in PostgreSQL.
 */

import { Pool } from "pg";
import { ErrorFactory } from "../../utils/errors";
import { Logger } from "../../utils/logger";

/**
 * Interface for bulk operation options
 */
interface BulkOptions {
  /** Maximum number of retries for failed operations */
  maxRetries?: number;
  /** Whether to use a transaction for the bulk operation */
  useTransaction?: boolean;
}

/**
 * Sends a bulk insert request to PostgreSQL using multi-row INSERT.
 *
 * @param client - The PostgreSQL Pool instance
 * @param records - An array of records to be inserted
 * @param tableName - The name of the PostgreSQL table
 * @param headers - Column names for the insert
 * @param onFailure - Callback function to handle failed records
 * @param options - Optional configuration for bulk operations
 * @throws Error after all retries are exhausted
 */
// PostgreSQL protocol hard limit on bind parameters per query
const PG_MAX_PARAMS = 65535;

export async function sendBulkInsertRequest(
  client: Pool,
  records: object[],
  tableName: string,
  headers: string[],
  onFailure: (count: number) => void,
  options: BulkOptions = {},
  onSkipped?: (count: number) => void
): Promise<object[]> {
  const maxRetries = options.maxRetries || 3;
  const useTransaction = options.useTransaction !== false;

  // PostgreSQL protocol limits bind parameters to 65535 per query.
  // Split records into sub-batches that stay under this limit.
  const maxRowsPerQuery = Math.max(1, Math.floor(PG_MAX_PARAMS / headers.length));
  if (records.length > maxRowsPerQuery) {
    Logger.debug`Splitting ${records.length} records into sub-batches of ${maxRowsPerQuery} (PostgreSQL parameter limit)`;
    const allInserted: object[] = [];
    for (let i = 0; i < records.length; i += maxRowsPerQuery) {
      const chunk = records.slice(i, i + maxRowsPerQuery);
      const inserted = await sendBulkInsertRequest(client, chunk, tableName, headers, onFailure, options, onSkipped);
      allInserted.push(...inserted);
    }
    return allInserted;
  }

  // Hoist everything that is constant across retry attempts
  const numHeaders = headers.length;

  // Insert with deduplication: if submission_metadata is present, skip rows
  // whose submission_id already exists (deterministic hash ensures same data = same ID).
  const conflictClause = headers.includes("submission_metadata")
    ? "ON CONFLICT ((submission_metadata->>'submission_id')) DO NOTHING"
    : "";

  // Build the INSERT query with multiple VALUES — same for all retry attempts
  const placeholders = records
    .map((_, recordIndex) => {
      const offset = recordIndex * numHeaders;
      return `(${headers.map((_, colIndex) => `$${offset + colIndex + 1}`).join(", ")})`;
    })
    .join(", ");

  const insertQuery = `
    INSERT INTO ${tableName} (${headers.map((h) => `"${h}"`).join(", ")})
    VALUES ${placeholders}
    ${conflictClause}
    RETURNING *
  `;

  // Flatten all record values into a pre-allocated array — same for all retry attempts
  const values: unknown[] = new Array(records.length * numHeaders);
  let vi = 0;
  for (const record of records) {
    const row = record as Record<string, unknown>;
    for (const header of headers) {
      const raw = row[header];
      // csv-parse is configured with trim:true so strings are already trimmed;
      // only convert empty/null/undefined to null
      values[vi++] = (raw == null || raw === "") ? null : raw;
    }
  }

  let attempt = 0;
  let success = false;
  let insertedRows: object[] = [];
  let lastError: string | undefined;

  while (attempt < maxRetries && !success) {
    const pgClient = await client.connect();

    try {
      if (useTransaction) {
        await pgClient.query("BEGIN");
      }

      Logger.debug`Executing bulk insert: ${records.length} records into ${tableName}`;

      const result = await pgClient.query(insertQuery, values);

      if (useTransaction) {
        await pgClient.query("COMMIT");
      }

      success = true;
      insertedRows = result.rows;

      const skipped = records.length - insertedRows.length;
      Logger.debug`Bulk insert successful: ${insertedRows.length} inserted, ${skipped} skipped as duplicates`;
      if (skipped > 0) {
        onSkipped?.(skipped);
      }
    } catch (error) {
      if (useTransaction) {
        try {
          await pgClient.query("ROLLBACK");
        } catch (rollbackError) {
          Logger.warnString(`Failed to rollback transaction: ${rollbackError}`);
        }
      }

      attempt++;
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      lastError = errorMessage;

      Logger.debug`PostgreSQL bulk insert attempt ${attempt} failed: ${errorMessage}`;

      // Extract column name from PG error messages (e.g. column "field_name" of relation...)
      const columnMatch = errorMessage.match(/column "([^"]+)"/);
      const columnHint = columnMatch ? ` (column: "${columnMatch[1]}")` : "";

      // Extract type/value info from invalid syntax errors
      const syntaxMatch = errorMessage.match(/invalid input syntax for (?:type )?(\w+): "([^"]+)"/);

      // Handle specific PostgreSQL errors — surface field details and throw immediately
      if (errorMessage.includes("duplicate key")) {
        const constraintMatch = errorMessage.match(/constraint "([^"]+)"/);
        const constraintHint = constraintMatch ? ` (constraint: "${constraintMatch[1]}")` : "";
        Logger.warnString(`PostgreSQL upload — duplicate key violation${constraintHint}`);
        throw ErrorFactory.validation(
          `PostgreSQL upload — duplicate key violation${constraintHint}`,
          { tableName, originalError: error },
          [
            "Remove duplicates from your CSV data",
            "Drop and recreate the table if you want to reload data",
          ]
        );
      }

      if (errorMessage.includes("violates not-null constraint")) {
        Logger.warnString(`PostgreSQL upload — NOT NULL constraint violated${columnHint}`);
        throw ErrorFactory.validation(
          `PostgreSQL upload — NOT NULL constraint violated${columnHint}`,
          { tableName, originalError: error },
          [
            columnMatch
              ? `Column "${columnMatch[1]}" requires a value but CSV has empty/null entries`
              : "Check for missing required values in your CSV data",
            "Ensure all NOT NULL columns have values",
          ]
        );
      }

      if (errorMessage.includes("violates foreign key constraint")) {
        const constraintMatch = errorMessage.match(/constraint "([^"]+)"/);
        const constraintHint = constraintMatch ? ` (constraint: "${constraintMatch[1]}")` : "";
        Logger.warnString(`PostgreSQL upload — foreign key constraint violated${constraintHint}`);
        throw ErrorFactory.validation(
          `PostgreSQL upload — foreign key constraint violated${constraintHint}`,
          { tableName, originalError: error },
          [
            "Check that referenced foreign key values exist in the related table",
            "Insert referenced records first",
          ]
        );
      }

      if (errorMessage.includes("invalid input syntax")) {
        const detail = syntaxMatch
          ? ` — expected ${syntaxMatch[1]}, got "${syntaxMatch[2]}"${columnHint}`
          : columnHint;
        Logger.warnString(`PostgreSQL upload — data type mismatch${detail}`);
        throw ErrorFactory.validation(
          `PostgreSQL upload — data type mismatch${detail}`,
          { tableName, originalError: error },
          [
            syntaxMatch
              ? `Column${columnHint} expects type "${syntaxMatch[1]}" but received "${syntaxMatch[2]}"`
              : "Check data types in your CSV match the table schema",
            "Verify date, number, and boolean formats",
          ]
        );
      }

      if (errorMessage.includes("column") && errorMessage.includes("does not exist")) {
        Logger.warnString(`PostgreSQL upload — column does not exist${columnHint}`);
        throw ErrorFactory.validation(
          `PostgreSQL upload — column does not exist${columnHint}`,
          { tableName, headers, originalError: error },
          [
            columnMatch
              ? `Column "${columnMatch[1]}" is in the CSV but not in table "${tableName}"`
              : "Check that CSV headers match table column names exactly",
          ]
        );
      }

      // Generic/transient error — log at warn and retry
      Logger.warnString(`PostgreSQL upload — insert failed (attempt ${attempt}/${maxRetries}): ${errorMessage}`);
      onFailure(records.length);

      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
      }
    } finally {
      pgClient.release();
    }
  }

  if (!success) {
    throw ErrorFactory.connection(
      `PostgreSQL upload — bulk insert failed after ${maxRetries} attempts: ${lastError ?? "unknown error"}`,
      { maxRetries, recordCount: records.length, tableName },
      [
        "Check PostgreSQL server status and connectivity",
        "Verify table schema and constraints",
        "Review data format and types",
        "Consider reducing batch size with -b",
      ]
    );
  }

  return insertedRows;
}