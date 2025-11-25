import type { ElasticsearchMapping } from "../types";
export interface LecternMappingOptions {
    ignoredSchemas?: string[];
    ignoredFields?: string[];
    skipMetadata?: boolean;
    customRules?: Partial<TypeMappingRules>;
}
interface TypeMappingRules {
    textFieldThreshold: number;
    datePatterns: string[];
    keywordFields: string[];
}
/**
 * Main function to generate Elasticsearch mapping from Lectern dictionary
 */
export declare function generateMappingFromLectern(lecternFilePath: string, indexName: string, options?: LecternMappingOptions): ElasticsearchMapping;
export {};
//# sourceMappingURL=generateESMappingFromLectern.d.ts.map