import * as fs from "fs";
import { parse as csvParse } from "csv-parse/sync";
import { ErrorFactory } from "./errors"; // UPDATED: Import ErrorFactory
import { CSVParseOptions } from "../types/validations";
import { Logger } from "./logger";

export function parseCSVLine(
  line: string,
  delimiter: string,
  isHeaderRow: boolean = false
): string[][] {
  try {
    Logger.debug`Parsing CSV line${isHeaderRow ? " (headers)" : ""}`;

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
        Logger.debug`Found ${headers[0].length} columns`;
      }
      return headers;
    }

    return result;
  } catch (error) {
    // UPDATED: Use ErrorFactory with helpful suggestions
    throw ErrorFactory.parsing("Error parsing CSV line", { line, error }, [
      "Check that the CSV delimiter is correct",
      "Ensure the CSV file is properly formatted",
      "Verify there are no unescaped quotes or special characters",
    ]);
  }
}
