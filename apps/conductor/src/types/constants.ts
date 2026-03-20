export const Profiles = {
  /** Upload CSV → PostgreSQL → Elasticsearch */
  UPLOAD: "upload",

  /** Upload CSV data directly to Elasticsearch */
  ES_UPLOAD: "upload-es",

  /** Upload CSV data to PostgreSQL */
  POSTGRES_UPLOAD: "upload-db",

  /** Index PostgreSQL table data to Elasticsearch */
  POSTGRES_INDEX: "index-db",
} as const;
