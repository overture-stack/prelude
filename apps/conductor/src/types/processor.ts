/**
 * Processor Types
 *
 * Type definitions for CSV processing and record handling.
 */

/**
 * Record metadata for tracking and audit purposes
 */
export interface RecordMetadata {
  /** Unique submission identifier */
  submitter_id: string;

  /** When the overall processing job started */
  processing_started: string;

  /** When this specific record was processed */
  processed_at: string;

  /** Source file path */
  source_file: string;

  /** Position in the file (row number) */
  record_number: number;

  /** Processing host name */
  hostname: string;

  /** Operating system username */
  username: string;
}

/**
 * Processed record structure
 */
export interface ProcessedRecord {
  /** Metadata for tracking and auditing */
  submission_metadata: RecordMetadata;

  /** The actual CSV data fields */
  data: Record<string, any>;
}

/**
 * Progress tracking callback
 */
export type ProgressCallback = (current: number, total: number) => void;

/**
 * Batch failure callback
 */
export type FailureCallback = (count: number) => void;

/**
 * Processing statistics
 */
export interface ProcessingStats {
  /** Total number of processed records */
  processed: number;

  /** Number of failed records */
  failed: number;

  /** Processing start time */
  startTime: number;

  /** Processing end time */
  endTime: number;

  /** Time taken in milliseconds */
  elapsedMs: number;
}
