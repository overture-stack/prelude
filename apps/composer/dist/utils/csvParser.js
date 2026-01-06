"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseCSVLine = parseCSVLine;
const sync_1 = require("csv-parse/sync");
const errors_1 = require("./errors"); // UPDATED: Import ErrorFactory
const logger_1 = require("./logger");
function parseCSVLine(line, delimiter, isHeaderRow = false) {
    try {
        logger_1.Logger.debug `Parsing CSV line${isHeaderRow ? " (headers)" : ""}`;
        const parseOptions = {
            delimiter,
            trim: true,
            skipEmptyLines: true,
            relax_column_count: true,
        };
        logger_1.Logger.debugObject("Parse options", parseOptions);
        const result = (0, sync_1.parse)(line, parseOptions);
        if (isHeaderRow) {
            const headers = result[0] ? [result[0]] : [];
            if (headers.length > 0) {
                logger_1.Logger.debug `Found ${headers[0].length} columns`;
            }
            return headers;
        }
        return result;
    }
    catch (error) {
        // UPDATED: Use ErrorFactory with helpful suggestions
        throw errors_1.ErrorFactory.parsing("Error parsing CSV line", { line, error }, [
            "Check that the CSV delimiter is correct",
            "Ensure the CSV file is properly formatted",
            "Verify there are no unescaped quotes or special characters",
        ]);
    }
}
//# sourceMappingURL=csvParser.js.map