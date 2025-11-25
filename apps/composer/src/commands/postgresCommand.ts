// src/commands/postgresCommand.ts
import * as path from "path";
import * as fs from "fs";
import { Command } from "./baseCommand";
import { CLIOutput } from "../types";
import { ErrorFactory } from "../utils/errors";
import { generatePostgresTable } from "../services/generatePostgresTable";
import { validateCSVHeaders } from "../validations";
import { parseCSVLine } from "../utils/csvParser";
import { Logger } from "../utils/logger";
import { CONFIG_PATHS } from "../utils/paths";

export class PostgresCommand extends Command {
  // Define postgres-specific defaults
  protected readonly defaultOutputFileName = "create_table.sql";

  constructor() {
    super("PostgreSQL Table", path.join("configs", "postgresConfigs"));
    this.defaultOutputFileName = "create_table.sql";
  }

  /**
   * Override isUsingDefaultPath to handle postgres-specific defaults
   */
  protected isUsingDefaultPath(cliOutput: CLIOutput): boolean {
    return (
      cliOutput.outputPath ===
        path.join("configs", "postgresConfigs", "create_table.sql") ||
      cliOutput.outputPath ===
        path.join("configs", "postgresConfigs") ||
      super.isUsingDefaultPath(cliOutput)
    );
  }

  protected async validate(cliOutput: CLIOutput): Promise<void> {
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
      } else {
        cliOutput.postgresConfig.tableName = defaultTableName;
      }

      Logger.defaultValueInfo(
        `No table name supplied, defaulting to: ${defaultTableName}`,
        "--table-name <name>"
      );
    }

    // Validate table name
    const tableName = cliOutput.postgresConfig.tableName;
    if (!/^[a-z_][a-z0-9_]*$/i.test(tableName)) {
      throw ErrorFactory.args("Invalid table name", [
        "Table names must start with a letter or underscore",
        "Use only letters, numbers, and underscores",
        "Example: --table-name patient_data",
        "Avoid SQL reserved words",
      ]);
    }

    // Get only CSV files from the paths (already expanded in base class)
    const csvFiles = cliOutput.filePaths.filter(
      (filePath) => path.extname(filePath).toLowerCase() === ".csv"
    );

    // Check if we've got valid CSV files
    if (csvFiles.length === 0) {
      throw ErrorFactory.file(
        "PostgreSQL table generation requires CSV input files",
        undefined,
        [
          "Ensure your input files have .csv extension",
          "Check that the files exist and are accessible",
          "Example: -f data.csv",
        ]
      );
    }

    // For now, only support single CSV file
    if (csvFiles.length > 1) {
      Logger.warn`Multiple CSV files detected, only the first file will be processed`;
      cliOutput.filePaths = [csvFiles[0]];
    } else {
      cliOutput.filePaths = csvFiles;
    }

    // Validate CSV headers for each file
    const validFiles: string[] = [];
    const invalidFiles: string[] = [];

    for (const filePath of cliOutput.filePaths) {
      try {
        const csvHeadersValid = await validateCSVHeaders(
          filePath,
          cliOutput.csvDelimiter
        );
        if (csvHeadersValid) {
          validFiles.push(filePath);
        } else {
          invalidFiles.push(filePath);
        }
      } catch (error) {
        Logger.warn`Error validating CSV headers in ${filePath}: ${error}`;
        invalidFiles.push(filePath);
      }
    }

    if (invalidFiles.length > 0) {
      Logger.warn`Skipping ${invalidFiles.length} files with invalid headers`;
      invalidFiles.forEach((file) => {
        Logger.generic(`  - ${path.basename(file)}`);
      });
      cliOutput.filePaths = validFiles;
    }

    if (cliOutput.filePaths.length === 0) {
      throw ErrorFactory.validation(
        "No valid CSV files found with proper headers",
        { invalidFiles },
        [
          "Check that CSV files have valid column headers",
          "Headers should not contain special characters or be empty",
          "Ensure files are properly formatted CSV files",
        ]
      );
    }

    Logger.info`Processing CSV file: ${path.basename(cliOutput.filePaths[0])}`;
  }

  protected async execute(cliOutput: CLIOutput): Promise<any> {
    const { postgresConfig } = cliOutput;
    const delimiter = cliOutput.csvDelimiter;

    // Get output path
    let outputPath = cliOutput.outputPath!;

    // Normalize output path for SQL files
    if (fs.existsSync(outputPath) && fs.statSync(outputPath).isDirectory()) {
      outputPath = path.join(outputPath, this.defaultOutputFileName);
      Logger.debug`Output is a directory, will create ${this.defaultOutputFileName} inside it`;
    } else if (!outputPath.endsWith(".sql")) {
      outputPath += ".sql";
      Logger.info`Adding .sql extension to output path`;
    }

    try {
      const filePath = cliOutput.filePaths[0];

      Logger.debug`Reading CSV file: ${path.basename(filePath)}`;
      const fileContent = fs.readFileSync(filePath, "utf-8");
      const lines = fileContent.split("\n").filter((line) => line.trim());

      if (lines.length < 2) {
        throw ErrorFactory.file(
          `CSV file ${filePath} must contain at least a header row and one data row`,
          filePath,
          [
            "Ensure the CSV has at least 2 rows (headers + data)",
            "Check that the file is not corrupted",
            "Verify the CSV format is correct",
          ]
        );
      }

      const headerLine = lines[0];
      const headers = parseCSVLine(headerLine, delimiter, true)[0];

      if (!headers) {
        throw ErrorFactory.parsing(
          `Failed to parse CSV headers in ${filePath}`,
          { filePath, delimiter },
          [
            "Check that the delimiter is correct",
            "Ensure the CSV format is valid",
            "Verify there are no unescaped quotes or special characters",
          ]
        );
      }

      // Analyze sample data for type inference
      const sampleData: Record<string, string[]> = {};
      headers.forEach((header) => {
        sampleData[header] = [];
      });

      // Sample up to 100 rows for type inference
      const sampleSize = Math.min(100, lines.length - 1);
      for (let i = 1; i <= sampleSize; i++) {
        const dataLine = lines[i];
        if (!dataLine.trim()) continue;

        const values = parseCSVLine(dataLine, delimiter, false)[0];
        if (values) {
          headers.forEach((header, index) => {
            if (values[index] !== undefined) {
              sampleData[header].push(values[index]);
            }
          });
        }
      }

      Logger.debug`Analyzing ${sampleSize} sample rows for type inference`;

      // Generate PostgreSQL CREATE TABLE statement
      const sqlStatement = generatePostgresTable(
        postgresConfig!.tableName,
        headers,
        sampleData
      );

      // Ensure output directory exists
      const outputDir = path.dirname(outputPath);
      this.createDirectoryIfNotExists(outputDir);

      // Write SQL to file
      fs.writeFileSync(outputPath, sqlStatement);
      Logger.success`PostgreSQL table creation script saved to ${outputPath}`;

      // Show summary
      Logger.debug`Table name: ${postgresConfig!.tableName}`;
      Logger.debug`Columns: ${headers.length}`;
      Logger.debug`Sample rows analyzed: ${sampleSize}`;

      return {
        tableName: postgresConfig!.tableName,
        columns: headers.length,
        sqlFile: outputPath,
        statement: sqlStatement,
      };
    } catch (error) {
      if (error instanceof Error && error.name === "ComposerError") {
        throw error;
      }
      throw ErrorFactory.generation(
        "Error generating PostgreSQL table",
        error,
        [
          "Check that the CSV file is properly formatted",
          "Ensure output directory is writable",
          "Verify file permissions and disk space",
        ]
      );
    }
  }
}