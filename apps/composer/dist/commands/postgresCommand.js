"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostgresCommand = void 0;
// src/commands/postgresCommand.ts
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const baseCommand_1 = require("./baseCommand");
const errors_1 = require("../utils/errors");
const generatePostgresTable_1 = require("../services/generatePostgresTable");
const validations_1 = require("../validations");
const csvParser_1 = require("../utils/csvParser");
const logger_1 = require("../utils/logger");
class PostgresCommand extends baseCommand_1.Command {
    constructor() {
        super("PostgreSQL Table", path.join("configs", "postgresConfigs"));
        // Define postgres-specific defaults
        this.defaultOutputFileName = "create_table.sql";
        this.defaultOutputFileName = "create_table.sql";
    }
    /**
     * Override isUsingDefaultPath to handle postgres-specific defaults
     */
    isUsingDefaultPath(cliOutput) {
        return (cliOutput.outputPath ===
            path.join("configs", "postgresConfigs", "create_table.sql") ||
            cliOutput.outputPath ===
                path.join("configs", "postgresConfigs") ||
            super.isUsingDefaultPath(cliOutput));
    }
    async validate(cliOutput) {
        await super.validate(cliOutput);
        // Validate postgres config (table name)
        if (!cliOutput.postgresConfig?.tableName) {
            // Set a default table name from the first file
            const firstFile = cliOutput.filePaths[0];
            const defaultTableName = path
                .basename(firstFile, path.extname(firstFile))
                .toLowerCase()
                .replace(/[^a-z0-9]/g, "_");
            if (!cliOutput.postgresConfig) {
                cliOutput.postgresConfig = { tableName: defaultTableName };
            }
            else {
                cliOutput.postgresConfig.tableName = defaultTableName;
            }
            logger_1.Logger.defaultValueInfo(`No table name supplied, defaulting to: ${defaultTableName}`, "--table-name <name>");
        }
        // Validate table name
        const tableName = cliOutput.postgresConfig.tableName;
        if (!/^[a-z_][a-z0-9_]*$/i.test(tableName)) {
            throw errors_1.ErrorFactory.args("Invalid table name", [
                "Table names must start with a letter or underscore",
                "Use only letters, numbers, and underscores",
                "Example: --table-name patient_data",
                "Avoid SQL reserved words",
            ]);
        }
        // Get only CSV files from the paths (already expanded in base class)
        const csvFiles = cliOutput.filePaths.filter((filePath) => path.extname(filePath).toLowerCase() === ".csv");
        // Check if we've got valid CSV files
        if (csvFiles.length === 0) {
            throw errors_1.ErrorFactory.file("PostgreSQL table generation requires CSV input files", undefined, [
                "Ensure your input files have .csv extension",
                "Check that the files exist and are accessible",
                "Example: -f data.csv",
            ]);
        }
        // For now, only support single CSV file
        if (csvFiles.length > 1) {
            logger_1.Logger.warn `Multiple CSV files detected, only the first file will be processed`;
            cliOutput.filePaths = [csvFiles[0]];
        }
        else {
            cliOutput.filePaths = csvFiles;
        }
        // Validate CSV headers for each file
        const validFiles = [];
        const invalidFiles = [];
        for (const filePath of cliOutput.filePaths) {
            try {
                const csvHeadersValid = await (0, validations_1.validateCSVHeaders)(filePath, cliOutput.csvDelimiter);
                if (csvHeadersValid) {
                    validFiles.push(filePath);
                }
                else {
                    invalidFiles.push(filePath);
                }
            }
            catch (error) {
                logger_1.Logger.warn `Error validating CSV headers in ${filePath}: ${error}`;
                invalidFiles.push(filePath);
            }
        }
        if (invalidFiles.length > 0) {
            logger_1.Logger.warn `Skipping ${invalidFiles.length} files with invalid headers`;
            invalidFiles.forEach((file) => {
                logger_1.Logger.generic(`  - ${path.basename(file)}`);
            });
            cliOutput.filePaths = validFiles;
        }
        if (cliOutput.filePaths.length === 0) {
            throw errors_1.ErrorFactory.validation("No valid CSV files found with proper headers", { invalidFiles }, [
                "Check that CSV files have valid column headers",
                "Headers should not contain special characters or be empty",
                "Ensure files are properly formatted CSV files",
            ]);
        }
        logger_1.Logger.info `Processing CSV file: ${path.basename(cliOutput.filePaths[0])}`;
    }
    async execute(cliOutput) {
        const { postgresConfig } = cliOutput;
        const delimiter = cliOutput.csvDelimiter;
        // Get output path
        let outputPath = cliOutput.outputPath;
        // Normalize output path for SQL files
        if (fs.existsSync(outputPath) && fs.statSync(outputPath).isDirectory()) {
            outputPath = path.join(outputPath, this.defaultOutputFileName);
            logger_1.Logger.debug `Output is a directory, will create ${this.defaultOutputFileName} inside it`;
        }
        else if (!outputPath.endsWith(".sql")) {
            outputPath += ".sql";
            logger_1.Logger.info `Adding .sql extension to output path`;
        }
        try {
            const filePath = cliOutput.filePaths[0];
            logger_1.Logger.debug `Reading CSV file: ${path.basename(filePath)}`;
            const fileContent = fs.readFileSync(filePath, "utf-8");
            const lines = fileContent.split("\n").filter((line) => line.trim());
            if (lines.length < 2) {
                throw errors_1.ErrorFactory.file(`CSV file ${filePath} must contain at least a header row and one data row`, filePath, [
                    "Ensure the CSV has at least 2 rows (headers + data)",
                    "Check that the file is not corrupted",
                    "Verify the CSV format is correct",
                ]);
            }
            const headerLine = lines[0];
            const headers = (0, csvParser_1.parseCSVLine)(headerLine, delimiter, true)[0];
            if (!headers) {
                throw errors_1.ErrorFactory.parsing(`Failed to parse CSV headers in ${filePath}`, { filePath, delimiter }, [
                    "Check that the delimiter is correct",
                    "Ensure the CSV format is valid",
                    "Verify there are no unescaped quotes or special characters",
                ]);
            }
            // Analyze sample data for type inference
            const sampleData = {};
            headers.forEach((header) => {
                sampleData[header] = [];
            });
            // Sample up to 100 rows for type inference
            const sampleSize = Math.min(100, lines.length - 1);
            for (let i = 1; i <= sampleSize; i++) {
                const dataLine = lines[i];
                if (!dataLine.trim())
                    continue;
                const values = (0, csvParser_1.parseCSVLine)(dataLine, delimiter, false)[0];
                if (values) {
                    headers.forEach((header, index) => {
                        if (values[index] !== undefined) {
                            sampleData[header].push(values[index]);
                        }
                    });
                }
            }
            logger_1.Logger.debug `Analyzing ${sampleSize} sample rows for type inference`;
            // Generate PostgreSQL CREATE TABLE statement
            const sqlStatement = (0, generatePostgresTable_1.generatePostgresTable)(postgresConfig.tableName, headers, sampleData);
            // Ensure output directory exists
            const outputDir = path.dirname(outputPath);
            this.createDirectoryIfNotExists(outputDir);
            // Write SQL to file
            fs.writeFileSync(outputPath, sqlStatement);
            logger_1.Logger.success `PostgreSQL table creation script saved to ${outputPath}`;
            // Show summary
            logger_1.Logger.debug `Table name: ${postgresConfig.tableName}`;
            logger_1.Logger.debug `Columns: ${headers.length}`;
            logger_1.Logger.debug `Sample rows analyzed: ${sampleSize}`;
            return {
                tableName: postgresConfig.tableName,
                columns: headers.length,
                sqlFile: outputPath,
                statement: sqlStatement,
            };
        }
        catch (error) {
            if (error instanceof Error && error.name === "ComposerError") {
                throw error;
            }
            throw errors_1.ErrorFactory.generation("Error generating PostgreSQL table", error, [
                "Check that the CSV file is properly formatted",
                "Ensure output directory is writable",
                "Verify file permissions and disk space",
            ]);
        }
    }
}
exports.PostgresCommand = PostgresCommand;
//# sourceMappingURL=postgresCommand.js.map