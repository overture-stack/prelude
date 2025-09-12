// src/types/constants.ts
/**
 * Constants used throughout the application
 *
 * This file defines constants for profiles, error codes, and other application-wide values.
 * Updated to remove scoreManifestUpload and songScoreSubmit profiles.
 * Updated with esUpload rename.
 */

/**
 * Available command profiles
 */
export const Profiles = {
  /** Unified upload command - handles PostgreSQL and/or Elasticsearch uploads */
  UPLOAD: "upload",

  /** Upload data to Elasticsearch (renamed from UPLOAD) */
  ES_UPLOAD: "esUpload",

  /** Upload data to PostgreSQL */
  POSTGRES_UPLOAD: "postgresUpload",

  /** Index data from PostgreSQL to Elasticsearch */
  POSTGRES_INDEX: "index",

  /** Upload schema to Lectern server */
  LECTERN_UPLOAD: "lecternUpload",

  /** Register a Lectern dictionary with Lyric */
  LYRIC_REGISTER: "lyricRegister",

  /** Upload data into Lyric */
  LYRIC_DATA: "lyricUpload",

  /** Index data using Maestro */
  INDEX_REPOSITORY: "maestroIndex",

  /** Upload schema to SONG server */
  SONG_UPLOAD_SCHEMA: "songUploadSchema",

  /** Create study in SONG server */
  SONG_CREATE_STUDY: "songCreateStudy",

  /** Submit analysis to SONG server and upload files to Score (combined workflow) */
  SONG_SUBMIT_ANALYSIS: "songSubmitAnalysis",

  /** Publish analysis in SONG server */
  SONG_PUBLISH_ANALYSIS: "songPublishAnalysis",
} as const;
