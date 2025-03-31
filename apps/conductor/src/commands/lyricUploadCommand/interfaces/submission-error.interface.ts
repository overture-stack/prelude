/**
 * Represents a detailed error from submission
 */
export interface DetailedSubmissionError {
  type?: string;
  message?: string;
  path?: string[];
  details?: string;
  count?: number;
}

/**
 * Represents comprehensive validation error details
 */
export interface ValidationErrorDetails {
  submissionId?: string;
  totalErrors?: number;
  errorSamples?: DetailedSubmissionError[];
  rawErrorData?: any;
  entityName?: string;
  errorLocation?: string;
}

/**
 * Represents a Lyric submission response
 */
export interface LyricSubmissionResponse {
  submissionId: string;
  status: string;
  [key: string]: any;
}
