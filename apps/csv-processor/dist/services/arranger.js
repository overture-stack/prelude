"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateArrangerConfigs = generateArrangerConfigs;
function formatFieldName(path) {
    return path.join('.');
}
function formatFacetFieldName(path) {
    return path.join('__');
}
function formatDisplayName(fieldName) {
    return fieldName
        .split(/[._]/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}
function generateJsonPathAndQuery(fieldName) {
    // Only generate for nested fields
    if (!fieldName.includes('.')) {
        return undefined;
    }
    const parts = fieldName.split('.');
    const jsonPath = `$.${parts.join('.hits.edges[*].node.')}`;
    const query = parts.map(part => `${part} { hits { edges { node {`).join(' ') +
        ` ${parts[parts.length - 1]} ` +
        '} } }'.repeat(parts.length);
    return {
        jsonPath,
        query,
    };
}
function processFields(properties, parentPath = []) {
    const extendedFields = [];
    const tableColumns = [];
    const facetAggregations = [];
    for (const [fieldName, field] of Object.entries(properties)) {
        const currentPath = [...parentPath, fieldName];
        if (field.type === 'object' && field.properties) {
            // Recursively process nested fields
            const nestedResults = processFields(field.properties, currentPath);
            extendedFields.push(...nestedResults.extendedFields);
            tableColumns.push(...nestedResults.tableColumns);
            facetAggregations.push(...nestedResults.facetAggregations);
        }
        else {
            const formattedFieldName = formatFieldName(currentPath);
            // Add to extended fields
            extendedFields.push({
                displayName: formatDisplayName(formattedFieldName),
                fieldName: formattedFieldName,
            });
            // Add to table columns
            const tableColumn = {
                canChangeShow: true,
                fieldName: formattedFieldName,
                show: currentPath.length === 1, // Show only top-level fields by default
                sortable: true,
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
                    show: true,
                });
            }
        }
    }
    return { extendedFields, tableColumns, facetAggregations };
}
function generateArrangerConfigs(mapping, indexName) {
    const { extendedFields, tableColumns, facetAggregations } = processFields(mapping.mappings.properties);
    const base = {
        documentType: 'file',
        index: indexName,
    };
    const extended = {
        extended: extendedFields,
    };
    const table = {
        table: {
            columns: tableColumns,
        },
    };
    const facets = {
        facets: {
            aggregations: facetAggregations,
        },
    };
    return {
        base,
        extended,
        table,
        facets,
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
