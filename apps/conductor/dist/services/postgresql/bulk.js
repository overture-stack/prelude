"use strict";
// src/services/postgresql/bulk.ts
/**
 * PostgreSQL Bulk Operations Module
 *
 * Provides functions for bulk insert operations in PostgreSQL.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendBulkInsertRequest = void 0;
const errors_1 = require("../../utils/errors");
const logger_1 = require("../../utils/logger");
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
async function sendBulkInsertRequest(client, records, tableName, headers, onFailure, options = {}) {
    const maxRetries = options.maxRetries || 3;
    const useTransaction = options.useTransaction !== false; // Default to true
    let attempt = 0;
    let success = false;
    while (attempt < maxRetries && !success) {
        const pgClient = await client.connect();
        try {
            if (useTransaction) {
                await pgClient.query("BEGIN");
            }
            // Build the INSERT query with multiple VALUES
            const placeholders = records
                .map((_, recordIndex) => {
                const recordPlaceholders = headers
                    .map((_, colIndex) => `$${recordIndex * headers.length + colIndex + 1}`)
                    .join(", ");
                return `(${recordPlaceholders})`;
            })
                .join(", ");
            // Simple INSERT - no upsert behavior
            const insertQuery = `
        INSERT INTO ${tableName} (${headers.map((h) => `"${h}"`).join(", ")})
        VALUES ${placeholders}
      `;
            // Flatten all record values into a single array
            const values = [];
            records.forEach((record) => {
                headers.forEach((header) => {
                    let value = record[header];
                    // Handle null/undefined values
                    if (value === undefined || value === null || value === "") {
                        value = null;
                    }
                    else if (typeof value === "string") {
                        // Trim whitespace
                        value = value.trim();
                        // Convert empty strings to null
                        if (value === "") {
                            value = null;
                        }
                    }
                    values.push(value);
                });
            });
            logger_1.Logger.debug `Executing bulk insert: ${records.length} records into ${tableName}`;
            // Execute the bulk insert
            await pgClient.query(insertQuery, values);
            if (useTransaction) {
                await pgClient.query("COMMIT");
            }
            success = true;
            logger_1.Logger.debug `Bulk insert successful: ${records.length} records inserted`;
        }
        catch (error) {
            if (useTransaction) {
                try {
                    await pgClient.query("ROLLBACK");
                }
                catch (rollbackError) {
                    logger_1.Logger.warnString(`Failed to rollback transaction: ${rollbackError}`);
                }
            }
            attempt++;
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger_1.Logger.debug `Bulk insert attempt ${attempt} failed: ${errorMessage}`;
            // Handle specific PostgreSQL errors
            if (errorMessage.includes("duplicate key")) {
                throw errors_1.ErrorFactory.validation("Duplicate key violation during bulk insert", {
                    attempt,
                    recordCount: records.length,
                    tableName,
                    originalError: error,
                }, [
                    "Check for duplicate primary key or unique constraint values",
                    "Remove duplicates from your CSV data",
                    "Drop and recreate the table if you want to reload data",
                ]);
            }
            if (errorMessage.includes("violates not-null constraint")) {
                throw errors_1.ErrorFactory.validation("NOT NULL constraint violation during bulk insert", {
                    attempt,
                    recordCount: records.length,
                    tableName,
                    originalError: error,
                }, [
                    "Check for missing required values in your CSV data",
                    "Ensure all NOT NULL columns have values",
                    "Review your table schema requirements",
                ]);
            }
            if (errorMessage.includes("violates foreign key constraint")) {
                throw errors_1.ErrorFactory.validation("Foreign key constraint violation during bulk insert", {
                    attempt,
                    recordCount: records.length,
                    tableName,
                    originalError: error,
                }, [
                    "Check that referenced foreign key values exist",
                    "Insert referenced records first",
                    "Verify foreign key relationships in your data",
                ]);
            }
            if (errorMessage.includes("invalid input syntax")) {
                throw errors_1.ErrorFactory.validation("Invalid data format during bulk insert", {
                    attempt,
                    recordCount: records.length,
                    tableName,
                    originalError: error,
                }, [
                    "Check data types in your CSV match the table schema",
                    "Verify date, number, and boolean formats",
                    "Review column data types and constraints",
                ]);
            }
            if (errorMessage.includes("column") &&
                errorMessage.includes("does not exist")) {
                throw errors_1.ErrorFactory.validation("Column does not exist in target table", {
                    attempt,
                    recordCount: records.length,
                    tableName,
                    headers,
                    originalError: error,
                }, [
                    "Check that CSV headers match table column names exactly",
                    "Verify table schema and column names",
                    "Create missing columns or update CSV headers",
                ]);
            }
            // Report failed records
            onFailure(records.length);
            if (attempt < maxRetries) {
                logger_1.Logger.debug `Retrying bulk insert... (${attempt}/${maxRetries})`;
                // Add exponential backoff delay
                await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
            }
        }
        finally {
            pgClient.release();
        }
    }
    if (!success) {
        throw errors_1.ErrorFactory.connection("Bulk insert failed after all retries", {
            maxRetries,
            recordCount: records.length,
            tableName,
        }, [
            "Check PostgreSQL server status and connectivity",
            "Verify table schema and constraints",
            "Review data format and types",
            "Consider reducing batch size",
        ]);
    }
}
exports.sendBulkInsertRequest = sendBulkInsertRequest;
