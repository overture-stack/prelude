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

  /** Load data into Lyric service */
  LYRIC_DATA: "lyricData",
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
  MAX_RETRIES: 10,

  /** Default retry delay in milliseconds */
  RETRY_DELAY: 20000,

  /** Default category ID for Lyric */
  CATEGORY_ID: "1",

  /** Default organization name */
  ORGANIZATION: "OICR",
};
