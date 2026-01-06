import * as path from "path";
import { v4 as uuidv4 } from "uuid";

export function createRecordMetadata(
  filePath: string,
  processingStartTime: string,
  recordNumber: number
): Record<string, any> {
  // Extract meaningful source identifier from file path
  let sourceFileName: string;

  if (filePath.startsWith("postgresql://")) {
    // Extract table name from PostgreSQL source identifier
    sourceFileName = filePath.replace("postgresql://", "");
  } else {
    // Extract just the filename from full file path
    sourceFileName = path.basename(filePath);
  }

  return {
    submission_id: uuidv4(),
    source_file_name: sourceFileName,
    processed_at: new Date().toISOString(),
  };
}
