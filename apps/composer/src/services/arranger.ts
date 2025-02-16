import type { ElasticsearchMapping, ElasticsearchField } from '../types/elasticsearch';
import type {
  ArrangerBaseConfig,
  ExtendedField,
  ArrangerExtendedConfig,
  TableColumn,
  ArrangerTableConfig,
  FacetAggregation,
  ArrangerFacetsConfig
} from '../types/arranger';

function formatFieldName(path: string[]): string {
  return path.join('.');
}

function formatFacetFieldName(path: string[]): string {
  return path.join('__');
}

function formatDisplayName(fieldName: string): string {
  return fieldName
    .split(/[._]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function generateJsonPathAndQuery(
  fieldName: string
): { jsonPath: string; query: string } | undefined {
  // Only generate for nested fields
  if (!fieldName.includes('.')) {
    return undefined;
  }

  const parts = fieldName.split('.');
  const jsonPath = `$.${parts.join('.')}`;

  // Properly close all nested field braces
  const query =
    parts
      .map((part, index) => {
        if (index === parts.length - 1) {
          return `${part}`;
        }
        return `${part} {`;
      })
      .join(' ') + ' }'.repeat(parts.length - 1); // Adding the correct amount of closing braces

  return {
    jsonPath,
    query
  };
}

function processFields(
  properties: Record<string, ElasticsearchField>,
  parentPath: string[] = []
): {
  extendedFields: ExtendedField[];
  tableColumns: TableColumn[];
  facetAggregations: FacetAggregation[];
} {
  const extendedFields: ExtendedField[] = [];
  const tableColumns: TableColumn[] = [];
  const facetAggregations: FacetAggregation[] = [];

  for (const [fieldName, field] of Object.entries(properties)) {
    const currentPath = [...parentPath, fieldName];

    if (field.type === 'object' && field.properties) {
      // Recursively process nested fields
      const nestedResults = processFields(field.properties, currentPath);
      extendedFields.push(...nestedResults.extendedFields);
      tableColumns.push(...nestedResults.tableColumns);
      facetAggregations.push(...nestedResults.facetAggregations);
    } else {
      const formattedFieldName = formatFieldName(currentPath);

      // Add to extended fields
      extendedFields.push({
        displayName: formatDisplayName(formattedFieldName),
        fieldName: formattedFieldName
      });

      // Add to table columns
      const tableColumn: TableColumn = {
        canChangeShow: true,
        fieldName: formattedFieldName,
        show: currentPath.length === 2,
        sortable: true
      };

      // Add jsonPath and query for nested fields
      const pathQuery = generateJsonPathAndQuery(formattedFieldName);
      if (pathQuery) {
        tableColumn.jsonPath = pathQuery.jsonPath;
        tableColumn.query = pathQuery.query;
      }

      tableColumns.push(tableColumn);

      // Add to facet aggregations for keyword fields
      if (field.type === 'keyword') {
        facetAggregations.push({
          active: true,
          fieldName: formatFacetFieldName(currentPath),
          show: true
        });
      }
    }
  }

  return { extendedFields, tableColumns, facetAggregations };
}

export function generateArrangerConfigs(
  mapping: ElasticsearchMapping,
  indexName: string
): {
  base: ArrangerBaseConfig;
  extended: ArrangerExtendedConfig;
  table: ArrangerTableConfig;
  facets: ArrangerFacetsConfig;
} {
  const { extendedFields, tableColumns, facetAggregations } = processFields(
    mapping.mappings.properties
  );

  const base: ArrangerBaseConfig = {
    documentType: 'file',
    index: indexName
  };

  const extended: ArrangerExtendedConfig = {
    extended: extendedFields
  };

  const table: ArrangerTableConfig = {
    table: {
      columns: tableColumns
    }
  };

  const facets: ArrangerFacetsConfig = {
    facets: {
      aggregations: facetAggregations
    }
  };

  return {
    base,
    extended,
    table,
    facets
  };
}

// Example usage:
/*
const mapping = // Your Elasticsearch mapping
const configs = generateArrangerConfigs(mapping, 'your-index-name');

// Write configs to files
fs.writeFileSync('base.json', JSON.stringify(configs.base, null, 2));
fs.writeFileSync('extended.json', JSON.stringify(configs.extended, null, 2));
fs.writeFileSync('table.json', JSON.stringify(configs.table, null, 2));
fs.writeFileSync('facets.json', JSON.stringify(configs.facets, null, 2));
*/
