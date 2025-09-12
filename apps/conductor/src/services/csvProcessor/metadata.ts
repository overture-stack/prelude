import * as crypto from "crypto";

export interface SubmissionMetadata {
  submission_id: string; // Groups records from same upload
  source_file_hash: string; // Detects duplicate files
  processed_at: string; // ISO timestamp
}

// Simplified function - generates basic submission metadata
export function createSubmissionMetadata(
  filePath: string,
  processingStartTime: string,
  recordNumber: number,
  fileContent: string
): SubmissionMetadata {
  // Create submission ID based on file and processing time
  const submissionSeed = `${filePath}:${processingStartTime}`;
  const submission_id = crypto
    .createHash("sha256")
    .update(submissionSeed)
    .digest("hex");

  // Hash file content to detect duplicate files
  const source_file_hash = crypto
    .createHash("md5")
    .update(fileContent)
    .digest("hex");

  return {
    submission_id,
    source_file_hash,
    processed_at: new Date().toISOString(),
  };
}
