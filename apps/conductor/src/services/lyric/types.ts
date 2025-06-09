// src/services/lyric/types.ts

/**
 * Parameters for dictionary registration
 */
export interface DictionaryRegistrationParams {
  categoryName: string;
  dictionaryName: string;
  dictionaryVersion: string;
  defaultCentricEntity: string;
  [key: string]: string;
}

/**
 * Response from Lyric dictionary registration
 */
export interface LyricRegistrationResponse {
  success: boolean;
  message?: string;
  error?: string;
  [key: string]: any;
}

/**
 * Parameters for data submission to Lyric
 */
export interface LyricSubmissionParams {
  categoryId: string;
  organization: string;
  dataDirectory: string;
  maxRetries?: number;
  retryDelay?: number;
}

/**
 * Response from Lyric data submission
 */
export interface LyricSubmissionResponse {
  submissionId: string;
  status: string;
  [key: string]: any;
}

/**
 * Data submission workflow result
 */
export interface DataSubmissionResult {
  submissionId: string;
  status: "COMMITTED" | "PENDING" | "VALID" | "INVALID";
  filesSubmitted: string[];
  message?: string;
}

/**
 * Lyric category information
 */
export interface LyricCategory {
  id: string;
  name: string;
  description?: string;
}

/**
 * Lyric dictionary information
 */
export interface LyricDictionary {
  id: string;
  name: string;
  version: string;
  categoryId: string;
  status: string;
}
