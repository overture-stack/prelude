import * as crypto from "crypto";
import * as path from "path";
import { v4 as uuidv4 } from "uuid";

/**
 * Transforms a PostgreSQL row into a normalised Elasticsearch document.
 * Parses existing submission_metadata from the row when present; falls back to
 * creating new metadata. Shared by postgresIndexCommand and postgresFullPipelineCommand.
 */
export function postgresRowToEsDocument(
  record: Record<string, unknown>,
  tableName: string
): Record<string, unknown> {
  let metadata: Record<string, unknown>;
  if (typeof record.submission_metadata === "string") {
    try {
      metadata = JSON.parse(record.submission_metadata) as Record<string, unknown>;
    } catch {
      metadata = createRecordMetadata(`postgresql://${tableName}`);
    }
  } else {
    metadata = createRecordMetadata(`postgresql://${tableName}`);
  }
  const { submission_metadata: _meta, ...dataColumns } = record;
  return { _id: metadata.submission_id, submission_metadata: metadata, data: dataColumns };
}

/** Creates submission metadata for a single record. Returns an object with submission_id, source_file_name, and processed_at. */
export function createRecordMetadata(
  filePath: string,
  recordData?: Record<string, unknown>,
  sortedKeys?: string[]
): Record<string, unknown> {
  // Extract meaningful source identifier from file path
  let sourceFileName: string;

  if (filePath.startsWith("postgresql://")) {
    // Extract table name from PostgreSQL source identifier
    sourceFileName = filePath.replace("postgresql://", "");
  } else {
    // Extract just the filename from full file path
    sourceFileName = path.basename(filePath);
  }

  // Generate a deterministic submission_id from record content if data is provided,
  // so re-uploading the same row produces the same ID (enables deduplication).
  // Falls back to a random UUID when no record data is available.
  let submission_id: string;
  if (recordData) {
    const keys = sortedKeys ?? Object.keys(recordData).sort();
    const sortedData = keys.reduce((acc, key) => {
      acc[key] = recordData[key];
      return acc;
    }, {} as Record<string, unknown>);
    submission_id = crypto
      .createHash("sha256")
      .update(JSON.stringify(sortedData))
      .digest("hex");
  } else {
    submission_id = uuidv4();
  }

  return {
    submission_id,
    source_file_name: sourceFileName,
    processed_at: new Date().toISOString(),
  };
}
