import * as fs from "fs";
import { parse as csvParse } from "csv-parse/sync";
import { ComposerError, ErrorCodes } from "./errors";
import { CSVParseOptions } from "../types/validations";
import { Logger } from "./logger";

export function parseCSVLine(
  line: string,
  delimiter: string,
  isHeaderRow: boolean = false
): string[][] {
  try {
    Logger.debug(`Parsing CSV line${isHeaderRow ? " (headers)" : ""}`);

    const parseOptions: CSVParseOptions = {
      delimiter,
      trim: true,
      skipEmptyLines: true,
      relax_column_count: true,
    };

    Logger.debugObject("Parse options", parseOptions);

    const result = csvParse(line, parseOptions);

    if (isHeaderRow) {
      const headers = result[0] ? [result[0]] : [];
      if (headers.length > 0) {
        Logger.debug(`Found ${headers[0].length} columns`);
      }
      return headers;
    }

    return result;
  } catch (error) {
    throw new ComposerError(
      "Error parsing CSV line",
      ErrorCodes.PARSING_ERROR,
      { line, error }
    );
  }
}

export function readCSVHeadersAndSample(
  filePath: string,
  delimiter: string
): { headers: string[]; sampleData: Record<string, string> } {
  try {
    Logger.debug(`Reading CSV file: ${filePath}`);
    Logger.debug(`Using delimiter: "${delimiter}"`);

    const fileContent = fs.readFileSync(filePath, "utf-8");
    const [headerLine, sampleLine] = fileContent.split("\n");

    if (!headerLine) {
      throw new ComposerError(
        "CSV file is empty or has no headers",
        ErrorCodes.INVALID_FILE
      );
    }

    const headers = parseCSVLine(headerLine, delimiter, true)[0];
    if (!headers) {
      throw new ComposerError(
        "Failed to parse CSV headers",
        ErrorCodes.PARSING_ERROR
      );
    }

    Logger.debug(`Found headers: ${headers.join(", ")}`);

    const sampleData: Record<string, string> = {};
    if (sampleLine) {
      const sampleValues = parseCSVLine(sampleLine, delimiter, false)[0];
      if (sampleValues) {
        headers.forEach((header: string, index: number) => {
          sampleData[header] = sampleValues[index] || "";
          Logger.debug(
            `Column "${header}": ${inferValueType(sampleValues[index] || "")}`
          );
        });
      }
    }

    return { headers, sampleData };
  } catch (error) {
    if (error instanceof ComposerError) {
      throw error;
    }
    throw new ComposerError(
      "Error reading CSV headers and sample",
      ErrorCodes.FILE_ERROR,
      error
    );
  }
}

export function inferValueType(
  value: string
): "string" | "number" | "boolean" | "date" {
  const lowerValue = value.toLowerCase().trim();

  // Check for boolean values
  if (["true", "false", "yes", "no", "1", "0"].includes(lowerValue)) {
    return "boolean";
  }

  // Check for numeric values
  if (!isNaN(Number(value)) && value.toString().trim() !== "") {
    return "number";
  }

  // Check for valid date values
  if (isValidDate(value)) {
    return "date";
  }

  // Default to string type
  return "string";
}

function isValidDate(dateString: string): boolean {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
}
