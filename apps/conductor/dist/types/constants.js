"use strict";
// src/types/constants.ts
/**
 * Constants used throughout the application
 *
 * This file defines constants for profiles, error codes, and other application-wide values.
 * Updated to remove scoreManifestUpload and songScoreSubmit profiles.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Profiles = void 0;
/**
 * Available command profiles
 */
exports.Profiles = {
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
    /** Submit analysis to SONG server and upload files to Score (combined workflow) */
    song_submit_analysis: "songSubmitAnalysis",
    /** Publish analysis in SONG server */
    song_publish_analysis: "songPublishAnalysis",
    /** Upload CSV data to PostgreSQL */
    POSTGRES_UPLOAD: "postgresUpload",
    /** Index PostgreSQL data to Elasticsearch */
    POSTGRES_INDEX: "postgresIndex",
};
