"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateBatchSize = exports.validateIndex = exports.validateElasticsearchConnection = void 0;
const errors_1 = require("../utils/errors");
const logger_1 = require("../utils/logger");
/**
 * Validates Elasticsearch connection by making a ping request.
 */
async function validateElasticsearchConnection(client, config) {
    try {
        logger_1.Logger.info `Testing connection to Elasticsearch at ${config.elasticsearch.url}`;
        logger_1.Logger.debug `Elasticsearch config: ${JSON.stringify(config.elasticsearch, null, 2)}`;
        const startTime = Date.now();
        const response = await client.ping();
        const responseTime = Date.now() - startTime;
        logger_1.Logger.info `Connected to Elasticsearch successfully in ${responseTime}ms`;
        return {
            valid: true,
            errors: [],
            responseTimeMs: responseTime,
        };
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger_1.Logger.debug `Connection error details: ${JSON.stringify(error, null, 2)}`;
        logger_1.Logger.debug `Error message: ${errorMessage}`;
        // Don't log error here - let calling code handle it
        logger_1.Logger.tipString("Check Elasticsearch is running and that the correct URL and auth params are in use");
        throw errors_1.ErrorFactory.connection(`Failed to connect to Elasticsearch`, {
            elasticsearchUrl: config.elasticsearch.url,
            originalError: error,
            errorMessage,
        }, [
            "Check that Elasticsearch is running and accessible",
            `Verify the URL: ${config.elasticsearch.url}`,
            "Check authentication credentials if required",
            "Review network connectivity and firewall settings",
            "Use --url <elasticsearch-url> to specify a different URL",
        ]);
    }
}
exports.validateElasticsearchConnection = validateElasticsearchConnection;
/**
 * Fetches a list of user-defined (non-system) indices from Elasticsearch.
 */
async function getAvailableIndices(client) {
    try {
        const response = await client.cat.indices({
            format: "json",
            h: "index",
        });
        if (Array.isArray(response.body)) {
            return response.body
                .map((idx) => idx.index)
                .filter((index) => index && !index.startsWith("."))
                .sort();
        }
        return [];
    }
    catch (error) {
        logger_1.Logger.debugString(`Could not fetch available indices: ${error}`);
        return [];
    }
}
/**
 * Validates that a given index exists in Elasticsearch.
 */
async function validateIndex(client, indexName) {
    var _a, _b, _c, _d, _e;
    logger_1.Logger.debug `Checking if index ${indexName} exists`;
    try {
        const { body } = await client.indices.get({ index: indexName });
        if (!body || !body[indexName]) {
            // Get available indices for helpful display
            const availableIndices = await getAvailableIndices(client);
            // Log the main error message
            logger_1.Logger.errorString(`Index '${indexName}' not found`);
            // Display available indices if they exist
            if (availableIndices.length > 0) {
                logger_1.Logger.suggestion("Available indices in Elasticsearch");
                availableIndices.forEach((index) => {
                    logger_1.Logger.generic(`   ▸ ${index}`);
                });
            }
            else {
                logger_1.Logger.suggestion("No user indices found in Elasticsearch");
                logger_1.Logger.generic("   ▸ You may need to create your first index");
            }
            // Create error but mark as already logged to prevent duplicate display
            const error = errors_1.ErrorFactory.validation(`Index '${indexName}' not found`, {
                indexName,
                responseBody: body,
                availableIndices,
                alreadyLogged: true,
            }, [] // Empty suggestions since we already displayed them above
            );
            error.isLogged = true;
            throw error;
        }
        logger_1.Logger.debug `Index ${indexName} exists`;
        return {
            valid: true,
            errors: [],
            exists: true,
        };
    }
    catch (indexError) {
        // If it's already our formatted error, rethrow it
        if (indexError instanceof Error &&
            indexError.name === "ConductorError" &&
            indexError.isLogged) {
            throw indexError;
        }
        if (((_c = (_b = (_a = indexError.meta) === null || _a === void 0 ? void 0 : _a.body) === null || _b === void 0 ? void 0 : _b.error) === null || _c === void 0 ? void 0 : _c.type) === "index_not_found_exception" ||
            ((_e = (_d = indexError.meta) === null || _d === void 0 ? void 0 : _d.body) === null || _e === void 0 ? void 0 : _e.status) === 404) {
            // Get available indices for helpful display
            const availableIndices = await getAvailableIndices(client);
            // Log the main error message
            logger_1.Logger.debug `Index '${indexName}' does not exist`;
            // Display available indices if they exist
            if (availableIndices.length > 0) {
                logger_1.Logger.suggestion("Available indices in Elasticsearch");
                availableIndices.forEach((index) => {
                    logger_1.Logger.generic(`   ▸ ${index}`);
                });
            }
            else {
                logger_1.Logger.suggestion("No user indices found in Elasticsearch");
                logger_1.Logger.generic("   ▸ You may need to create your first index");
            }
            // Create error but mark as already logged
            const error = errors_1.ErrorFactory.validation(`Index '${indexName}' does not exist`, {
                indexName,
                errorType: "index_not_found_exception",
                availableIndices,
                originalError: indexError,
                alreadyLogged: true,
            }, [
                "Check the index name spelling and case sensitivity",
                "Use -i <index-name> to specify a different index",
                "Create the index in Elasticsearch first",
            ]);
            error.isLogged = true;
            throw error;
        }
        const errorMessage = indexError instanceof Error ? indexError.message : String(indexError);
        throw errors_1.ErrorFactory.connection(`Failed to check if index ${indexName} exists`, {
            indexName,
            originalError: indexError,
            errorMessage,
        }, [
            "Check Elasticsearch connection and availability",
            "Verify you have permissions to access the index",
            "Ensure Elasticsearch service is running",
            "Review Elasticsearch logs for errors",
        ]);
    }
}
exports.validateIndex = validateIndex;
/**
 * Validates that batch size is a positive number and warns about excessive size.
 */
function validateBatchSize(batchSize) {
    if (!batchSize || isNaN(batchSize) || batchSize <= 0) {
        throw errors_1.ErrorFactory.validation("Batch size must be a positive number", {
            provided: batchSize,
            type: typeof batchSize,
        }, [
            "Provide a positive number for batch size",
            "Recommended range: 100–5000",
            "Example: --batch-size 1000",
        ]);
    }
    if (batchSize > 10000) {
        logger_1.Logger.warnString(`Batch size ${batchSize} is quite large and may cause performance issues`);
        logger_1.Logger.tipString("Consider using a smaller batch size (1000–5000) for better performance");
    }
    else {
        logger_1.Logger.debug `Batch size validated: ${batchSize}`;
    }
}
exports.validateBatchSize = validateBatchSize;
