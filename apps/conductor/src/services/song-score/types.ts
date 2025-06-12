// src/services/song/types.ts

/**
 * Parameters for SONG schema upload
 */
export interface SongSchemaUploadParams {
  schemaContent: string;
  [key: string]: string; // Index signature for validation compatibility
}

/**
 * Response from SONG schema upload
 */
export interface SongSchemaUploadResponse {
  id?: string;
  name?: string;
  version?: string;
  error?: string;
  [key: string]: any;
}

/**
 * Parameters for SONG study creation
 */
export interface SongStudyCreateParams {
  studyId: string;
  name: string;
  organization: string;
  description?: string;
  force?: boolean;
  [key: string]: any;
}

/**
 * Response from SONG study creation
 */
export interface SongStudyResponse {
  studyId: string;
  name: string;
  organization: string;
  status: "CREATED" | "EXISTING";
  message?: string;
  [key: string]: any;
}

/**
 * Parameters for SONG analysis submission
 */
export interface SongAnalysisSubmitParams {
  analysisContent: string;
  studyId: string;
  allowDuplicates?: boolean;
  [key: string]: any;
}

/**
 * Response from SONG analysis submission
 */
export interface SongAnalysisResponse {
  analysisId: string;
  studyId: string;
  analysisType: string;
  status: "CREATED" | "EXISTING";
  message?: string;
  [key: string]: any;
}

/**
 * Parameters for SONG analysis publication
 */
export interface SongPublishParams {
  analysisId: string;
  studyId: string;
  ignoreUndefinedMd5?: boolean;
  [key: string]: any;
}

/**
 * Response from SONG analysis publication
 */
export interface SongPublishResponse {
  analysisId: string;
  studyId: string;
  status: "PUBLISHED";
  message?: string;
  [key: string]: any;
}

// src/services/score/types.ts

/**
 * Parameters for Score manifest upload workflow
 */
export interface ScoreManifestUploadParams {
  analysisId: string;
  dataDir: string;
  manifestFile: string;
  songUrl?: string;
  authToken?: string;
  [key: string]: any;
}

/**
 * Response from Score manifest upload
 */
export interface ScoreManifestUploadResponse {
  success: boolean;
  analysisId: string;
  manifestFile: string;
  manifestContent: string;
  message?: string;
  [key: string]: any;
}

/**
 * Parameters for manifest generation
 */
export interface ManifestGenerationParams {
  analysisId: string;
  manifestFile: string;
  dataDir: string;
  songUrl?: string;
  authToken?: string;
}

/**
 * Combined SONG/Score workflow parameters
 */
export interface SongScoreWorkflowParams {
  // Analysis submission
  analysisContent: string;
  studyId: string;
  allowDuplicates?: boolean;

  // File upload
  dataDir: string;
  manifestFile: string;

  // Publishing
  ignoreUndefinedMd5?: boolean;

  // Service configuration
  songUrl?: string;
  scoreUrl?: string;
  authToken?: string;

  [key: string]: any;
}

/**
 * Combined SONG/Score workflow response
 */
export interface SongScoreWorkflowResponse {
  success: boolean;
  analysisId: string;
  studyId: string;
  manifestFile: string;
  status: "COMPLETED" | "PARTIAL" | "FAILED";
  steps: {
    submitted: boolean;
    uploaded: boolean;
    published: boolean;
  };
  message?: string;
  [key: string]: any;
}
