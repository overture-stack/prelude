import * as os from "os";
import { v4 as uuidv4 } from "uuid";

export function createRecordMetadata(
  filePath: string,
  processingStartTime: string,
  recordNumber: number
): Record<string, any> {
  return {
    submitter_id: uuidv4(),
    processing_started: processingStartTime,
    processed_at: new Date().toISOString(),
    source_file: filePath,
    record_number: recordNumber,
    hostname: os.hostname(),
    username: os.userInfo().username,
  };
}
