import type { ElasticsearchMapping } from "../types";
interface TypeInferenceRules {
    maxTextLength: number;
    datePatterns: string[];
    excludePatterns: string[];
}
export interface MappingOptions {
    ignoredFields?: string[];
    skipMetadata?: boolean;
    customRules?: Partial<TypeInferenceRules>;
}
export declare function generateMappingFromJson(jsonFilePath: string, indexName: string, options?: MappingOptions): ElasticsearchMapping;
export {};
//# sourceMappingURL=generateEsMappingFromJSON.d.ts.map