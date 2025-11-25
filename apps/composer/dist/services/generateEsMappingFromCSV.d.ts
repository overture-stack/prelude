import type { ElasticsearchMapping } from "../types";
interface TypeInferenceRules {
    maxTextLength: number;
    datePatterns: string[];
    excludePatterns: string[];
    booleanValues: string[];
}
interface CSVMappingOptions {
    skipMetadata?: boolean;
    customRules?: Partial<TypeInferenceRules>;
}
export declare function generateMappingFromCSV(csvHeaders: string[], sampleData: Record<string, string>, indexName?: string, options?: CSVMappingOptions): ElasticsearchMapping;
export {};
//# sourceMappingURL=generateEsMappingFromCSV.d.ts.map