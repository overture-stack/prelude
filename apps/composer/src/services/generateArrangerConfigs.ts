import { Logger } from "../utils/logger";
import type {
  ArrangerBaseConfig,
  ExtendedField,
  ArrangerExtendedConfig,
  TableColumn,
  ArrangerTableConfig,
  FacetAggregation,
  ArrangerFacetsConfig,
} from "../types";
import type { ElasticsearchMapping, ElasticsearchField } from "../types";

// ---- Field Name Formatting Utilities ----

/**
 * Joins path segments with dots to create standard field names
 * Example: ['data', 'user', 'name'] → 'data.user.name'
 */
function formatFieldName(path: string[]): string {
  return path.join(".");
}

/**
 * Joins path segments with double underscores for facet field names
 * Example: ['data', 'user', 'name'] → 'data__user__name'
 */
function formatFacetFieldName(path: string[]): string {
  return path.join("__");
}

/**
 * Formats field names for display by capitalizing words and replacing separators
 * Example: 'user.first_name' → 'User First Name'
 */
function formatDisplayName(fieldName: string): string {
  return fieldName
    .split(/[._]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

// ---- Path and Query Generation ----

/**
 * Generates JSON path and GraphQL query for nested fields
 * Only generates for fields that contain dots (nested fields)
 * Example: 'user.address.city' →
 *   jsonPath: '$.user.address.city'
 *   query: 'user { address { city } }'
 */
function generateJsonPathAndQuery(
  fieldName: string
): { jsonPath: string; query: string } | undefined {
  if (!fieldName.includes(".")) {
    return undefined;
  }

  const parts = fieldName.split(".");
  const jsonPath = `$.${parts.join(".")}`;
  const query =
    parts
      .map((part, index) => {
        if (index === parts.length - 1) {
          return `${part}`;
        }
        return `${part} {`;
      })
      .join(" ") + " }".repeat(parts.length - 1);

  return { jsonPath, query };
}

// ---- Field Processing ----

/**
 * Processes Elasticsearch mapping fields to generate Arranger configurations
 * Handles nested fields recursively and generates:
 * - Extended fields with display names
 * - Table columns with visibility settings
 * - Facet aggregations for various field types
 */
function processFields(
  properties: Record<string, ElasticsearchField>,
  parentPath: string[] = []
): {
  extendedFields: ExtendedField[];
  tableColumns: TableColumn[];
  facetAggregations: FacetAggregation[];
} {
  Logger.debug(`Processing fields with parent path: ${parentPath.join(".")}`);

  const extendedFields: ExtendedField[] = [];
  const tableColumns: TableColumn[] = [];
  const facetAggregations: FacetAggregation[] = [];

  for (const [fieldName, field] of Object.entries(properties)) {
    const currentPath = [...parentPath, fieldName];

    if (field.type === "object" && field.properties) {
      Logger.debug(
        `Recursively processing nested object: ${currentPath.join(".")}`
      );

      // Recursively process nested fields
      const nestedResults = processFields(field.properties, currentPath);
      extendedFields.push(...nestedResults.extendedFields);
      tableColumns.push(...nestedResults.tableColumns);
      facetAggregations.push(...nestedResults.facetAggregations);
    } else {
      const formattedFieldName = formatFieldName(currentPath);

      // Add to extended fields
      const extendedField = {
        displayName: formatDisplayName(formattedFieldName),
        fieldName: formattedFieldName,
      };
      extendedFields.push(extendedField);
      Logger.debug(`Added extended field: ${JSON.stringify(extendedField)}`);

      // Add to table columns
      const tableColumn: TableColumn = {
        canChangeShow: true,
        fieldName: formattedFieldName,
        show: currentPath.length === 2, // Show by default if it's a top-level field
        sortable: true,
      };

      // Add jsonPath and query for nested fields
      const pathQuery = generateJsonPathAndQuery(formattedFieldName);
      if (pathQuery) {
        tableColumn.jsonPath = pathQuery.jsonPath;
        tableColumn.query = pathQuery.query;
      }

      tableColumns.push(tableColumn);
      Logger.debug(`Added table column: ${JSON.stringify(tableColumn)}`);

      // Add to facet aggregations for various field types
      if (
        field.type === "keyword" ||
        field.type === "text" ||
        field.type === "integer" ||
        field.type === "float" ||
        field.type === "date"
      ) {
        const facetAggregation = {
          active: true,
          fieldName: formatFacetFieldName(currentPath),
          show: true,
        };
        facetAggregations.push(facetAggregation);
        Logger.debug(
          `Added facet aggregation: ${JSON.stringify(facetAggregation)}`
        );
      }
    }
  }

  return { extendedFields, tableColumns, facetAggregations };
}

// ---- Main Config Generation ----

/**
 * Generates Arranger configurations from an Elasticsearch mapping
 * Creates four configuration files:
 * - base.json: Basic index configuration
 * - extended.json: Field display names and metadata
 * - table.json: Table column configuration
 * - facets.json: Search facet configuration
 *   TODO update documentType to be dynamic based in user input
 */
export function generateArrangerConfigs(
  mapping: ElasticsearchMapping,
  indexName: string,
  documentType: "file" | "analysis" = "file"
): {
  base: ArrangerBaseConfig;
  extended: ArrangerExtendedConfig;
  table: ArrangerTableConfig;
  facets: ArrangerFacetsConfig;
} {
  Logger.info(`Generating Arranger configs for index: ${indexName}`);
  Logger.info(`Document type: ${documentType}`);

  try {
    const { extendedFields, tableColumns, facetAggregations } = processFields(
      mapping.mappings.properties
    );

    Logger.info(`Generated ${extendedFields.length} extended fields`);
    Logger.info(`Generated ${tableColumns.length} table columns`);
    Logger.info(`Generated ${facetAggregations.length} facet aggregations`);

    const configs = {
      base: {
        documentType,
        index: indexName,
      },
      extended: {
        extended: extendedFields,
      },
      table: {
        table: {
          columns: tableColumns,
        },
      },
      facets: {
        facets: {
          aggregations: facetAggregations,
        },
      },
    };

    Logger.debugObject("Configuration summary", configs);
    return configs;
  } catch (error) {
    Logger.error("Error generating Arranger configurations");
    Logger.error("Error details");
    throw error;
  }
}

/* Usage Example:
const mapping = // Your Elasticsearch mapping
const configs = generateArrangerConfigs(mapping, 'your-index-name');

// Write configs to files
fs.writeFileSync('base.json', JSON.stringify(configs.base, null, 2));
fs.writeFileSync('extended.json', JSON.stringify(configs.extended, null, 2));
fs.writeFileSync('table.json', JSON.stringify(configs.table, null, 2));
fs.writeFileSync('facets.json', JSON.stringify(configs.facets, null, 2));
*/
