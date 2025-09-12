// src/types/postgres.ts
export interface PostgresConfig {
  tableName: string;
  schema?: string;
  includeConstraints?: boolean;
  includeIndexes?: boolean;
}
