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
