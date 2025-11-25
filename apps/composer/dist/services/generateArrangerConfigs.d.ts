import type { ArrangerBaseConfig, ArrangerExtendedConfig, ArrangerTableConfig, ArrangerFacetsConfig } from "../types";
import type { ElasticsearchMapping } from "../types";
/**
 * Main function to generate Arranger configurations from Elasticsearch mapping
 * Creates four configuration files:
 * - base.json: Basic index configuration
 * - extended.json: Field display names and metadata
 * - table.json: Table column configuration
 * - facets.json: Search facet configuration
 */
export declare function ArrangerConfigs(mapping: ElasticsearchMapping, indexName?: string, documentType?: "file" | "analysis"): {
    base: ArrangerBaseConfig;
    extended: ArrangerExtendedConfig;
    table: ArrangerTableConfig;
    facets: ArrangerFacetsConfig;
};
//# sourceMappingURL=generateArrangerConfigs.d.ts.map