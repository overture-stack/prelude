interface PostgresTypeInferenceRules {
    maxVarcharLength: number;
    datePatterns: string[];
    timestampPatterns: string[];
    booleanValues: string[];
    integerThreshold: number;
    decimalPrecision: number;
    decimalScale: number;
}
interface PostgresTableOptions {
    customRules?: Partial<PostgresTypeInferenceRules>;
}
/**
 * Generates a PostgreSQL CREATE TABLE statement from CSV headers and sample data
 */
export declare function generatePostgresTable(tableName: string, headers: string[], sampleData: Record<string, string[]>, options?: PostgresTableOptions): string;
export {};
//# sourceMappingURL=generatePostgresTable.d.ts.map