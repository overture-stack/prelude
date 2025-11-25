// src/services/generatePostgresTable.ts
import { Logger } from "../utils/logger";

// ---- Type Inference Configuration ----

interface PostgresTypeInferenceRules {
  maxVarcharLength: number;
  datePatterns: string[];
  timestampPatterns: string[];
  booleanValues: string[];
  integerThreshold: number;
  decimalPrecision: number;
  decimalScale: number;
}

interface PostgresTableOptions {
  customRules?: Partial<PostgresTypeInferenceRules>;
}

const defaultRules: PostgresTypeInferenceRules = {
  maxVarcharLength: 255,
  datePatterns: ["date", "birth", "created", "updated", "modified"],
  timestampPatterns: ["timestamp", "time", "datetime", "_at", "_on"],
  booleanValues: ["true", "false", "yes", "no", "y", "n", "1", "0", "t", "f"],
  integerThreshold: 2147483647, // PostgreSQL INTEGER max value
  decimalPrecision: 10,
  decimalScale: 2,
};

// ---- Type Inference Functions ----

function isValidDate(dateString: string): boolean {
  if (!dateString || dateString.trim() === "") return false;

  // Check common date formats
  const dateFormats = [
    /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD
    /^\d{2}\/\d{2}\/\d{4}$/, // MM/DD/YYYY
    /^\d{2}-\d{2}-\d{4}$/, // MM-DD-YYYY
    /^\d{4}\/\d{2}\/\d{2}$/, // YYYY/MM/DD
  ];

  const matchesFormat = dateFormats.some((format) => format.test(dateString));
  if (!matchesFormat) return false;

  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
}

function isValidTimestamp(timestampString: string): boolean {
  if (!timestampString || timestampString.trim() === "") return false;

  // Check for timestamp formats
  const timestampFormats = [
    /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/, // YYYY-MM-DD HH:MM:SS
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/, // ISO format
  ];

  const matchesFormat = timestampFormats.some((format) =>
    format.test(timestampString)
  );
  if (!matchesFormat) return false;

  const date = new Date(timestampString);
  return date instanceof Date && !isNaN(date.getTime());
}

function analyzeNumericValues(values: string[]): {
  isAllInteger: boolean;
  isAllNumeric: boolean;
  maxValue: number;
  minValue: number;
  hasDecimals: boolean;
  maxDecimalPlaces: number;
} {
  let isAllInteger = true;
  let isAllNumeric = true;
  let maxValue = Number.NEGATIVE_INFINITY;
  let minValue = Number.POSITIVE_INFINITY;
  let hasDecimals = false;
  let maxDecimalPlaces = 0;

  const numericValues = values.filter((v) => v && v.trim() !== "");

  for (const value of numericValues) {
    const trimmedValue = value.trim();
    if (trimmedValue === "") continue;

    const numValue = Number(trimmedValue);
    if (isNaN(numValue)) {
      isAllNumeric = false;
      isAllInteger = false;
      break;
    }

    maxValue = Math.max(maxValue, numValue);
    minValue = Math.min(minValue, numValue);

    if (!Number.isInteger(numValue)) {
      isAllInteger = false;
      hasDecimals = true;

      const decimalPart = trimmedValue.split(".")[1];
      if (decimalPart) {
        maxDecimalPlaces = Math.max(maxDecimalPlaces, decimalPart.length);
      }
    }
  }

  return {
    isAllInteger,
    isAllNumeric,
    maxValue: maxValue === Number.NEGATIVE_INFINITY ? 0 : maxValue,
    minValue: minValue === Number.POSITIVE_INFINITY ? 0 : minValue,
    hasDecimals,
    maxDecimalPlaces,
  };
}

function inferPostgresType(
  columnName: string,
  sampleValues: string[],
  rules: PostgresTypeInferenceRules = defaultRules
): string {
  Logger.debug`Inferring PostgreSQL type for column: ${columnName}`;

  // Filter out empty values for analysis
  const nonEmptyValues = sampleValues.filter((v) => v && v.trim() !== "");

  if (nonEmptyValues.length === 0) {
    Logger.debugString("All values are empty, defaulting to VARCHAR");
    return `VARCHAR(${rules.maxVarcharLength})`;
  }

  const lowerColumnName = columnName.toLowerCase();

  // Check for boolean values
  const uniqueValues = [
    ...new Set(nonEmptyValues.map((v) => v.toLowerCase().trim())),
  ];
  if (
    uniqueValues.length <= 2 &&
    uniqueValues.every((v) => rules.booleanValues.includes(v))
  ) {
    Logger.debugString("Detected BOOLEAN type");
    return "BOOLEAN";
  }

  // Check for numeric types
  const numericAnalysis = analyzeNumericValues(nonEmptyValues);
  if (numericAnalysis.isAllNumeric) {
    if (numericAnalysis.isAllInteger) {
      // Choose appropriate integer type based on range
      if (
        numericAnalysis.maxValue <= 32767 &&
        numericAnalysis.minValue >= -32768
      ) {
        Logger.debugString("Detected SMALLINT type");
        return "SMALLINT";
      } else if (
        numericAnalysis.maxValue <= rules.integerThreshold &&
        numericAnalysis.minValue >= -rules.integerThreshold - 1
      ) {
        Logger.debugString("Detected INTEGER type");
        return "INTEGER";
      } else {
        Logger.debugString("Detected BIGINT type");
        return "BIGINT";
      }
    } else {
      // Decimal/numeric type
      const precision = Math.max(
        rules.decimalPrecision,
        numericAnalysis.maxDecimalPlaces + 5
      );
      const scale = Math.max(
        rules.decimalScale,
        numericAnalysis.maxDecimalPlaces
      );
      Logger.debugString(
        `Detected DECIMAL type with precision ${precision}, scale ${scale}`
      );
      return `DECIMAL(${precision},${scale})`;
    }
  }

  // Check for date/timestamp types based on column name and sample values
  const hasDatePattern = rules.datePatterns.some((pattern) =>
    lowerColumnName.includes(pattern)
  );
  const hasTimestampPattern = rules.timestampPatterns.some((pattern) =>
    lowerColumnName.includes(pattern)
  );

  if (hasTimestampPattern || nonEmptyValues.some((v) => isValidTimestamp(v))) {
    Logger.debugString("Detected TIMESTAMP type");
    return "TIMESTAMP";
  }

  if (hasDatePattern || nonEmptyValues.some((v) => isValidDate(v))) {
    Logger.debugString("Detected DATE type");
    return "DATE";
  }

  // Check maximum string length for VARCHAR sizing
  const maxLength = Math.max(...nonEmptyValues.map((v) => v.length));

  if (maxLength > rules.maxVarcharLength) {
    Logger.debugString("Detected TEXT type (long strings)");
    return "TEXT";
  }

  // Use VARCHAR with appropriate length
  const varcharLength = Math.max(maxLength * 1.5, 50); // Add 50% buffer, minimum 50
  const finalLength = Math.min(
    Math.ceil(varcharLength),
    rules.maxVarcharLength
  );

  Logger.debugString(`Detected VARCHAR(${finalLength}) type`);
  return `VARCHAR(${finalLength})`;
}

// ---- Main Export Function ----

/**
 * Generates a PostgreSQL CREATE TABLE statement from CSV headers and sample data
 */
export function generatePostgresTable(
  tableName: string,
  headers: string[],
  sampleData: Record<string, string[]>,
  options: PostgresTableOptions = {}
): string {
  try {
    Logger.debugString("Generating PostgreSQL CREATE TABLE statement");
    Logger.debug`Table name: ${tableName}`;
    Logger.debug`Processing ${headers.length} columns`;

    const rules: PostgresTypeInferenceRules = {
      ...defaultRules,
      ...options.customRules,
    };

    // Sanitize table name
    const sanitizedTableName = tableName
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "_");
    if (sanitizedTableName !== tableName) {
      Logger.warn`Table name "${tableName}" sanitized to "${sanitizedTableName}"`;
    }

    // Build column definitions
    const columnDefinitions: string[] = [];

    headers.forEach((header, index) => {
      // Sanitize column name
      const sanitizedHeader = header.toLowerCase().replace(/[^a-z0-9_]/g, "_");
      if (sanitizedHeader !== header) {
        Logger.debug`Column "${header}" sanitized to "${sanitizedHeader}"`;
      }

      // Infer data type
      const sampleValues = sampleData[header] || [];
      const dataType = inferPostgresType(sanitizedHeader, sampleValues, rules);

      let columnDef = `  ${sanitizedHeader} ${dataType}`;

      columnDefinitions.push(columnDef);
    });

    // Add submission_metadata JSONB column
    columnDefinitions.push("  submission_metadata JSONB");

    // Build the CREATE TABLE statement
    let sql = "";

    sql += `-- PostgreSQL table creation script\n`;
    sql += `-- Generated from CSV analysis\n`;
    sql += `-- Table: ${sanitizedTableName}\n`;
    sql += `-- Columns: ${headers.length + 1} (${headers.length} data + 1 submission_metadata)\n\n`;

    sql += `CREATE TABLE IF NOT EXISTS ${sanitizedTableName} (\n`;
    sql += columnDefinitions.join(",\n");
    sql += "\n);\n";

    // Add helpful comments
    sql += `\n-- Table created for ${headers.length + 1} columns (${headers.length} data + 1 submission_metadata)\n`;
    sql += `-- Sample data analysis: ${Math.max(
      ...Object.values(sampleData).map((arr) => arr.length)
    )} rows\n`;

    // Add JSONB usage examples
    sql += `\n-- JSONB submission_metadata usage examples:\n`;
    sql += `-- INSERT: submission_metadata = '{"submission_id": "abc123", "source_file_hash": "def456", "processed_at": "2025-09-03T21:04:07.761Z"}'\n`;
    sql += `-- Query by submission_id: WHERE submission_metadata->>'submission_id' = 'abc123'\n`;
    sql += `-- Query by hash: WHERE submission_metadata->>'source_file_hash' = 'def456'\n`;
    sql += `-- Query by date: WHERE (submission_metadata->>'processed_at')::timestamp > '2025-01-01'\n`;

    Logger.debugString(
      "PostgreSQL CREATE TABLE statement generated successfully"
    );
    return sql;
  } catch (error) {
    Logger.errorString("Error generating PostgreSQL table");
    Logger.debugObject("Error details", { tableName, headers, error });
    throw error;
  }
}