"use strict";
// src/commands/postgresIndexCommand.ts
/**
 * PostgreSQL to Elasticsearch Index Command - UPDATED for nested data structure
 *
 * Command implementation for reading data from a PostgreSQL table
 * and indexing it directly into Elasticsearch with proper nested data mapping.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostgresIndexCommand = void 0;
const baseCommand_1 = require("./baseCommand");
const logger_1 = require("../utils/logger");
const errors_1 = require("../utils/errors");
const postgresql_1 = require("../services/postgresql");
const elasticsearch_1 = require("../services/elasticsearch");
const bulk_1 = require("../services/elasticsearch/bulk");
const pg_cursor_1 = __importDefault(require("pg-cursor"));
const metadata_1 = require("../services/csvProcessor/metadata");
const progressBar_1 = require("../services/csvProcessor/progressBar");
const postgresProcessor_1 = require("../services/csvProcessor/postgresProcessor");
const fileValidator_1 = require("../validations/fileValidator");
class PostgresIndexCommand extends baseCommand_1.Command {
    constructor() {
        super("postgresIndex");
    }
    /**
     * Executes the full workflow: CSV upload to PostgreSQL + indexing to Elasticsearch
     */
    async execute(cliOutput) {
        const { config, filePaths } = cliOutput;
        let pgClient;
        let esClient;
        try {
            const hasFiles = filePaths && filePaths.length > 0;
            // Set up clients
            pgClient = (0, postgresql_1.createPostgresClient)(config);
            esClient = (0, elasticsearch_1.createClientFromConfig)(config);
            // Validate connections
            logger_1.Logger.debug `Validating PostgreSQL connection`;
            await (0, postgresql_1.validateConnection)(pgClient, config);
            logger_1.Logger.debug `Validating Elasticsearch connection`;
            await (0, elasticsearch_1.validateConnection)(esClient);
            const tableName = config.postgresql.table;
            const indexName = config.elasticsearch.index;
            // Step 1: Upload CSV files to PostgreSQL if files are provided
            if (hasFiles) {
                await this.uploadFilesToPostgreSQL(filePaths, config, pgClient);
            }
            // Step 2: Index PostgreSQL data to Elasticsearch with streaming
            const result = await this.streamIndexToElasticsearch(pgClient, esClient, tableName, indexName, config.batchSize || 1000, config.pgReadChunkSize || 10000);
            if (result.totalProcessed === 0) {
                logger_1.Logger.warn `No data found in table ${tableName}`;
                return {
                    success: true,
                    details: {
                        recordsProcessed: 0,
                        recordsIndexed: 0,
                        message: `No data found in table ${tableName}`,
                    },
                };
            }
            logger_1.Logger.successString(`Indexing complete: ${result.totalIndexed} records indexed to ${indexName}`);
            return {
                success: true,
                details: {
                    filesUploaded: hasFiles ? filePaths.length : 0,
                    recordsProcessed: result.totalProcessed,
                    recordsIndexed: result.totalIndexed,
                    sourceTable: tableName,
                    targetIndex: indexName,
                },
            };
        }
        catch (error) {
            if (error instanceof Error && error.name === "ConductorError") {
                throw error;
            }
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw errors_1.ErrorFactory.validation(`Indexing failed: ${errorMessage}`, { originalError: error }, [
                "Check PostgreSQL and Elasticsearch connections",
                "Verify table and index names are correct",
                "Review error details for specific issues",
            ]);
        }
        finally {
            // Clean up connections
            if (pgClient) {
                try {
                    logger_1.Logger.debug `Closing PostgreSQL connection pool`;
                    await pgClient.end();
                }
                catch (closeError) {
                    logger_1.Logger.debug `Warning: Error closing PostgreSQL connection: ${closeError}`;
                }
            }
            // Force exit after cleanup
            setTimeout(() => {
                process.exit(0);
            }, 500);
        }
    }
    /**
     * Validates command line arguments and configuration
     */
    async validate(cliOutput) {
        const { config, filePaths } = cliOutput;
        // Validate files if provided
        if (filePaths && filePaths.length > 0) {
            const fileValidationResult = await (0, fileValidator_1.validateFiles)(filePaths);
            if (!fileValidationResult.valid) {
                const errorDetails = fileValidationResult.errors.join("; ");
                throw errors_1.ErrorFactory.invalidFile(`File validation failed ${errorDetails}`, undefined, fileValidationResult.errors.concat([
                    "Check file extensions (.csv, .tsv allowed)",
                    "Verify files exist and are accessible",
                    "Ensure files are not empty",
                ]));
            }
        }
        // Validate PostgreSQL configuration
        if (!config.postgresql) {
            throw errors_1.ErrorFactory.args("PostgreSQL configuration is required", [
                "Provide PostgreSQL connection details",
                "Example: --db-host localhost:5435 --db-name mydb -t mytable",
            ]);
        }
        if (!config.postgresql.table) {
            throw errors_1.ErrorFactory.args("PostgreSQL table name is required", [
                "Use -t or --table option to specify the source table",
                "Example: -t demo_data",
            ]);
        }
        // Validate Elasticsearch configuration
        if (!config.elasticsearch) {
            throw errors_1.ErrorFactory.args("Elasticsearch configuration is required", [
                "Provide Elasticsearch connection details",
                "Example: --url http://localhost:9200 --index my_index",
            ]);
        }
        if (!config.elasticsearch.index) {
            throw errors_1.ErrorFactory.args("Elasticsearch index name is required", [
                "Use --index option to specify the target index",
                "Example: --index demo_data_index",
            ]);
        }
    }
    /**
     * Streams data from PostgreSQL and indexes to Elasticsearch in batches
     * Memory-efficient approach using cursors to avoid loading entire table into memory
     */
    async streamIndexToElasticsearch(pgClient, esClient, tableName, indexName, esBatchSize, pgReadChunkSize) {
        let totalProcessed = 0;
        let totalIndexed = 0;
        let failedRecords = 0;
        const startTime = Date.now();
        const processingStartTime = new Date().toISOString();
        // Get a dedicated client from the pool for cursor operations
        const client = await pgClient.connect();
        try {
            logger_1.Logger.debug `PostgreSQL chunk size: ${pgReadChunkSize}, Elasticsearch batch size: ${esBatchSize}`;
            // Get total record count for accurate progress tracking
            logger_1.Logger.debug `Counting total records in ${tableName}`;
            const countResult = await client.query(`SELECT COUNT(*) FROM ${tableName}`);
            const totalRecords = parseInt(countResult.rows[0].count, 10);
            console.log("");
            logger_1.Logger.info `Indexing ${totalRecords} records from ${tableName} into ${indexName}`;
            // Create cursor for streaming data from PostgreSQL
            const cursor = client.query(new pg_cursor_1.default(`SELECT * FROM ${tableName}`));
            let buffer = [];
            let hasMoreRows = true;
            while (hasMoreRows) {
                // Read chunk from PostgreSQL
                const rows = await new Promise((resolve, reject) => {
                    cursor.read(pgReadChunkSize, (err, rows) => {
                        if (err)
                            reject(err);
                        else
                            resolve(rows);
                    });
                });
                if (rows.length === 0) {
                    hasMoreRows = false;
                }
                else {
                    totalProcessed += rows.length;
                    buffer.push(...rows);
                }
                // Process buffer when it reaches ES batch size or we've read all data
                while (buffer.length >= esBatchSize ||
                    (!hasMoreRows && buffer.length > 0)) {
                    const batch = buffer.splice(0, esBatchSize);
                    // Transform PostgreSQL records to Elasticsearch documents
                    const esDocuments = batch.map((record, j) => {
                        // Extract existing metadata from PostgreSQL record, or create new if missing
                        let metadata;
                        if (record.submission_metadata) {
                            try {
                                // Parse existing metadata from PostgreSQL (stored as JSON string)
                                metadata = JSON.parse(record.submission_metadata);
                            }
                            catch (error) {
                                logger_1.Logger.debug `Failed to parse existing submission_metadata, creating new: ${error}`;
                                metadata = (0, metadata_1.createRecordMetadata)(`postgresql://${tableName}`, processingStartTime, totalIndexed + j + 1);
                            }
                        }
                        else {
                            // Create new metadata if none exists
                            metadata = (0, metadata_1.createRecordMetadata)(`postgresql://${tableName}`, processingStartTime, totalIndexed + j + 1);
                        }
                        // Separate data from metadata columns
                        const { submission_metadata, ...dataColumns } = record;
                        // Structure the document with standardized format
                        return {
                            submission_metadata: metadata,
                            data: dataColumns,
                        };
                    });
                    // Send batch to Elasticsearch
                    await (0, bulk_1.sendBulkWriteRequest)(esClient, esDocuments, indexName, (failureCount) => {
                        failedRecords += failureCount;
                    }, {
                        maxRetries: 3,
                        refresh: false,
                        writeErrorLog: true,
                    });
                    totalIndexed += batch.length;
                    // Update progress with accurate total
                    this.updateProgressDisplay(totalIndexed, totalRecords, startTime);
                    // If we've processed all remaining buffer and no more rows, exit
                    if (buffer.length === 0 && !hasMoreRows) {
                        break;
                    }
                }
            }
            // Close cursor
            await new Promise((resolve, reject) => {
                cursor.close((err) => {
                    if (err)
                        reject(err);
                    else
                        resolve();
                });
            });
            // Final refresh to make all data searchable
            logger_1.Logger.debug `Refreshing index ${indexName}`;
            await esClient.indices.refresh({ index: indexName });
            // Add newline after progress bar
            if (totalIndexed > 0) {
                process.stdout.write("\n");
            }
            logger_1.Logger.generic(`   └─ Indexed ${totalIndexed} records to ${indexName}`);
            if (failedRecords > 0) {
                logger_1.Logger.warnString(`Indexing completed with ${failedRecords} failed records`);
            }
            return { totalProcessed, totalIndexed };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            if (errorMessage.includes("relation") &&
                errorMessage.includes("does not exist")) {
                throw errors_1.ErrorFactory.invalidFile(`Table "${tableName}" does not exist`, tableName, [
                    "Check that the table name is correct",
                    "Verify the table exists in the specified database",
                    "Make sure you have read permissions on the table",
                ]);
            }
            throw errors_1.ErrorFactory.validation("Failed to stream and index data", {
                tableName,
                indexName,
                totalProcessed,
                totalIndexed,
                failedRecords,
                originalError: error,
            }, [
                "Check PostgreSQL and Elasticsearch connections",
                "Verify table exists and is accessible",
                "Review error logs for detailed information",
                "Ensure sufficient memory is available",
            ]);
        }
        finally {
            // Release the client back to the pool
            client.release();
        }
    }
    /**
     * Reads all data from a PostgreSQL table
     * @deprecated Use streamIndexToElasticsearch for memory-efficient processing
     */
    async readTableData(client, tableName) {
        try {
            logger_1.Logger.debug `Executing query: SELECT * FROM ${tableName}`;
            const result = await client.query(`SELECT * FROM ${tableName}`);
            logger_1.Logger.debug `Query returned ${result.rows.length} rows`;
            return result.rows;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            if (errorMessage.includes("relation") &&
                errorMessage.includes("does not exist")) {
                throw errors_1.ErrorFactory.invalidFile(`Table "${tableName}" does not exist`, tableName, [
                    "Check that the table name is correct",
                    "Verify the table exists in the specified database",
                    "Make sure you have read permissions on the table",
                ]);
            }
            throw errors_1.ErrorFactory.validation(`Failed to read data from table ${tableName}`, { tableName, originalError: error }, [
                "Check PostgreSQL connection",
                "Verify table exists and is accessible",
                "Check your permissions on the table",
            ]);
        }
    }
    /**
     * Indexes data to Elasticsearch in batches with proper nested data structure
     * Enhanced with improved bulk operations and error handling
     */
    async indexToElasticsearch(client, data, indexName, batchSize, sourceTable) {
        let totalIndexed = 0;
        let failedRecords = 0;
        const startTime = Date.now();
        const processingStartTime = new Date().toISOString();
        try {
            logger_1.Logger.info `Starting indexing of ${data.length} records to ${indexName}`;
            // Process data in batches
            for (let i = 0; i < data.length; i += batchSize) {
                const batch = data.slice(i, i + batchSize);
                // Transform PostgreSQL records to Elasticsearch documents
                const esDocuments = batch.map((record, j) => {
                    const recordId = record.id || `${i + j + 1}`;
                    // Extract existing metadata from PostgreSQL record, or create new if missing
                    let metadata;
                    if (record.submission_metadata) {
                        try {
                            // Parse existing metadata from PostgreSQL (stored as JSON string)
                            metadata = JSON.parse(record.submission_metadata);
                        }
                        catch (error) {
                            logger_1.Logger.debug `Failed to parse existing submission_metadata, creating new: ${error}`;
                            metadata = (0, metadata_1.createRecordMetadata)(`postgresql://${sourceTable}`, processingStartTime, i + j + 1);
                        }
                    }
                    else {
                        // Create new metadata if none exists
                        metadata = (0, metadata_1.createRecordMetadata)(`postgresql://${sourceTable}`, processingStartTime, i + j + 1);
                    }
                    // Separate data from metadata columns
                    const { submission_metadata, ...dataColumns } = record;
                    // Structure the document with standardized format
                    return {
                        submission_metadata: metadata,
                        data: dataColumns,
                    };
                });
                // Use enhanced bulk operations with error analysis
                await (0, bulk_1.sendBulkWriteRequest)(client, esDocuments, indexName, (failureCount) => {
                    failedRecords += failureCount;
                }, {
                    maxRetries: 3,
                    refresh: false,
                    writeErrorLog: true,
                });
                const successfulInBatch = batch.length -
                    (failedRecords -
                        (totalIndexed > 0 ? failedRecords - batch.length : 0));
                totalIndexed += Math.max(0, successfulInBatch);
                // Update progress
                this.updateProgressDisplay(i + batch.length, data.length, startTime);
            }
            // Final refresh to make all data searchable
            logger_1.Logger.debug `Refreshing index ${indexName}`;
            await client.indices.refresh({ index: indexName });
            // Clear progress line and show summary
            process.stdout.write("\r" + " ".repeat(80) + "\r");
            if (failedRecords > 0) {
                logger_1.Logger.warnString(`Indexing completed with ${failedRecords} failed records`);
                logger_1.Logger.successString(`Successfully indexed ${totalIndexed} out of ${data.length} records`);
            }
            else {
                logger_1.Logger.successString(`Successfully indexed all ${totalIndexed} records`);
            }
            return totalIndexed;
        }
        catch (error) {
            throw errors_1.ErrorFactory.validation("Failed to index data to Elasticsearch", {
                indexName,
                totalRecords: data.length,
                processedRecords: totalIndexed,
                failedRecords,
                originalError: error,
            }, [
                "Check Elasticsearch connection and status",
                "Verify index permissions and mapping",
                "Review error logs for detailed information",
                "Ensure PostgreSQL data types match Elasticsearch field types",
            ]);
        }
    }
    /**
     * Updates progress display with enhanced formatting
     */
    updateProgressDisplay(processed, total, startTime) {
        const elapsedMs = Math.max(1, Date.now() - startTime);
        const progress = Math.min(100, (processed / total) * 100);
        const progressBar = (0, progressBar_1.createProgressBar)(progress, "blue");
        const recordsPerSecond = Math.round(processed / (elapsedMs / 1000));
        // Show progress every 1000 records, every 10% for small datasets, or when complete
        const showProgress = processed % 1000 === 0 ||
            processed === total ||
            (total < 1000 && processed % Math.max(1, Math.floor(total / 10)) === 0);
        if (showProgress) {
            // Clear the line first, then write new progress
            process.stdout.clearLine(0);
            process.stdout.cursorTo(0);
            process.stdout.write(`   └─ ${progressBar} ${processed}/${total} | ${recordsPerSecond} records/sec`);
        }
    }
    /**
     * This command accepts optional input files for full workflow
     */
    requiresInputFiles() {
        return false; // Files are optional
    }
    /**
     * Uploads CSV files to PostgreSQL table
     */
    async uploadFilesToPostgreSQL(filePaths, config, client) {
        let successCount = 0;
        let failureCount = 0;
        for (const filePath of filePaths) {
            try {
                logger_1.Logger.info `Processing file: ${filePath}`;
                await (0, postgresProcessor_1.processCSVFileForPostgres)(filePath, config, client);
                logger_1.Logger.success `Successfully uploaded ${filePath} to PostgreSQL`;
                successCount++;
            }
            catch (error) {
                failureCount++;
                // Log the error but continue processing other files
                if (error instanceof Error && error.name === "ConductorError") {
                    const conductorError = error;
                    logger_1.Logger.errorString(`${conductorError.message}`);
                    if (conductorError.suggestions &&
                        conductorError.suggestions.length > 0) {
                        logger_1.Logger.suggestion("Suggestions");
                        conductorError.suggestions.forEach((suggestion) => {
                            logger_1.Logger.tipString(suggestion);
                        });
                    }
                }
                else {
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    logger_1.Logger.errorString(`Failed to upload ${filePath}: ${errorMessage}`);
                }
            }
        }
        if (failureCount === 0) {
            logger_1.Logger.successString(`Successfully uploaded all ${successCount} files to PostgreSQL`);
        }
        else if (successCount === 0) {
            throw errors_1.ErrorFactory.validation("All file uploads failed", { successCount, failureCount }, [
                "Check PostgreSQL connection and table permissions",
                "Verify CSV file format and data types",
                "Review error messages above for specific issues",
            ]);
        }
        else {
            logger_1.Logger.warnString(`Uploaded ${successCount} files successfully, ${failureCount} failed`);
            logger_1.Logger.tipString("Continuing with indexing using successfully uploaded data");
        }
    }
}
exports.PostgresIndexCommand = PostgresIndexCommand;
