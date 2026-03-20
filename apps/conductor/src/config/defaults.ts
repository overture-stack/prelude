/**
 * Default values for all CLI options and configuration.
 * Single source of truth — referenced by cli/options.ts and cli/index.ts.
 */
export const DEFAULTS = {
  BATCH_SIZE: 5000,
  DELIMITER: ",",

  ES_HOST: "localhost",
  ES_PORT: 9200,
  ES_USER: "elastic",
  ES_PASSWORD: "myelasticpassword",
  ES_INDEX: "data",

  DB_HOST: "localhost",
  DB_PORT: 5435,
  DB_NAME: "overtureDb",
  DB_USER: "admin",
  DB_PASSWORD: "admin123",
  DB_TABLE: "data",
} as const;
