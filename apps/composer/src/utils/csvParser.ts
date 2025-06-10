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
    throw new ComposerError(
      "Error parsing CSV line",
      ErrorCodes.PARSING_ERROR,
      { line, error }
    );
  }
}
