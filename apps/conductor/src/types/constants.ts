/**
 * Constants used throughout the application
 *
 * This file defines constants for profiles, error codes, and other application-wide values.
 * New profiles should be added here to make them available throughout the application.
 */

/**
 * Available command profiles
 */
export const Profiles = {
  /** Upload data to Elasticsearch */
  UPLOAD: "upload",

  /** Setup Elasticsearch indices and templates */
  INDEX_MANAGEMENT: "indexManagement",

  /** Upload schema to Lectern server */
  LECTERN_UPLOAD: "lecternUpload",

  /** Register a Lectern dictionary with Lyric */
  LYRIC_REGISTER: "lyricRegister",

  /** Upload data into Lyric */
  LYRIC_DATA: "lyricUpload",

  /** Index data using Maestro */
  INDEX_REPOSITORY: "maestroIndex",

  /** Upload schema to SONG server */
  song_upload_schema: "songUploadSchema",

  /** Create study in SONG server */
  song_create_study: "songCreateStudy",

  /** Submit analysis to SONG server */
  song_submit_analysis: "songSubmitAnalysis",

  /** Generate manifest and upload with Score */
  score_manifest_upload: "scoreManifestUpload",

  /** Publish analysis in SONG server */
  song_publish_analysis: "songPublishAnalysis",

  /** Combined SONG/SCORE workflow */
  song_score_submit: "songScoreSubmit",
} as const;

/**
 * UI-friendly descriptions for profiles
 */
export const ProfileDescriptions = {
  [Profiles.UPLOAD]: "Upload data to Elasticsearch",
  [Profiles.INDEX_MANAGEMENT]: "Setup Elasticsearch indices and templates",
  [Profiles.LECTERN_UPLOAD]: "Upload schema to Lectern server",
  [Profiles.LYRIC_REGISTER]: "Register a Lectern dictionary with Lyric",
  [Profiles.LYRIC_DATA]: "Load data into Lyric service",
  [Profiles.INDEX_REPOSITORY]: "Repository Indexing",
  [Profiles.song_upload_schema]: "Upload schema to SONG server",
  [Profiles.song_create_study]: "Create study in SONG server",
  [Profiles.song_submit_analysis]: "Submit analysis to SONG server",
  [Profiles.score_manifest_upload]:
    "Generate manifest and upload files with Score",
  [Profiles.song_publish_analysis]: "Publish analysis in SONG server",
  [Profiles.song_score_submit]: "End-to-end SONG/SCORE workflow",
};

/**
 * Default values used throughout the application
 */
export const Defaults = {
  /** Default port for the application */
  PORT: 3000,

  /** Default batch size for uploads */
  BATCH_SIZE: 1000,

  /** Default delimiter for CSV files */
  DELIMITER: ",",

  /** Default max retries for Lyric operations */
  MAX_RETRIES: 0,

  /** Default retry delay in milliseconds */
  RETRY_DELAY: 20000,

  /** Default category ID for Lyric */
  CATEGORY_ID: "1",

  /** Default organization name */
  ORGANIZATION: "OICR",
};
