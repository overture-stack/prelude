"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ArrangerConfigs = ArrangerConfigs;
const logger_1 = require("../utils/logger");
// ---- Field Name Formatting Utilities ----
/**
 * Joins path segments with dots to create standard field names
 * Example: ['data', 'user', 'name'] → 'data.user.name'
 */
function formatFieldName(path) {
    return path.join(".");
}
/**
 * Joins path segments with double underscores for facet field names
 * Example: ['data', 'user', 'name'] → 'data__user__name'
 */
function formatFacetFieldName(path) {
    return path.join("__");
}
/**
 * Formats field names for display by capitalizing words and replacing separators
 * Removes container prefix (like 'data') for cleaner display
 * Example: 'data.user.first_name' → 'User First Name'
 */
function formatDisplayName(fieldName) {
    // Split by dots and remove the container field if present
    const parts = fieldName.split(/[._]/);
    if (parts.length > 1 && isContainerField(parts[0])) {
        parts.shift(); // Remove the container field
    }
    return parts
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
}
// ---- Path and Query Generation ----
/**
 * Generates a proper JSON path for a nested field in Elasticsearch
 * Correctly formats paths for nested arrays with hits.edges[*].node structure
 *
 * @param fieldPath Array of path segments to the field
 * @param fieldTypeMap Map of field paths to their Elasticsearch types
 * @returns Properly formatted jsonPath string
 */
function generateJsonPath(fieldPath, fieldTypeMap) {
    if (fieldPath.length <= 1) {
        return undefined;
    }
    // Start with root
    let path = "$";
    let currentPathSegments = [];
    // Build the path segment by segment with appropriate nesting structure
    for (let i = 0; i < fieldPath.length; i++) {
        const segment = fieldPath[i];
        currentPathSegments.push(segment);
        // Add the current segment to the path
        path += `.${segment}`;
        // Check if this segment is a nested type and not the last segment
        if (i < fieldPath.length - 1) {
            const currentPath = currentPathSegments.join(".");
            const fieldType = fieldTypeMap.get(currentPath);
            // Add the hits.edges[*].node structure for nested types
            if (fieldType === "nested") {
                path += ".hits.edges[*].node";
            }
        }
    }
    return path;
}
/**
 * Generates a GraphQL query string for a nested field
 * Creates a properly nested query structure following Arranger's requirements
 *
 * @param fieldPath Array of path segments to the field
 * @param fieldTypeMap Map of field paths to their Elasticsearch types
 * @returns GraphQL query string
 */
function generateGraphQLQuery(fieldPath, fieldTypeMap) {
    if (fieldPath.length <= 1) {
        return undefined;
    }
    // Build the query from bottom up
    let query = fieldPath[fieldPath.length - 1];
    let currentPathSegments = [...fieldPath];
    // Remove the last element as we've already added it
    currentPathSegments.pop();
    // Work backwards through the path to create the nested structure
    while (currentPathSegments.length > 0) {
        // Get the last segment in our current path
        const segment = currentPathSegments.pop();
        // Build the path string to check if this is a nested field
        const checkPath = fieldPath
            .slice(0, currentPathSegments.length + 1)
            .join(".");
        const fieldType = fieldTypeMap.get(checkPath);
        // For fields that are marked as 'nested' type in Elasticsearch
        if (fieldType === "nested") {
            query = `${segment} { hits { edges { node { ${query} } } } }`;
        }
        else {
            // Standard object nesting
            query = `${segment} { ${query} }`;
        }
    }
    return query;
}
// ---- Field Processing ----
/**
 * Processes Elasticsearch mapping fields to generate Arranger configurations
 * Handles nested fields recursively and generates extended fields, table columns, and facet aggregations
 *
 * @param properties The Elasticsearch mapping properties to process
 * @param parentPath Optional array of parent path segments
 * @param fieldTypeMap Map of field paths to their Elasticsearch types
 * @returns Object containing extended fields, table columns, and facet aggregations
 */
function processFields(properties, parentPath = [], fieldTypeMap = new Map()) {
    logger_1.Logger.debug `Processing fields with parent path: ${parentPath.join(".")}`;
    const extendedFields = [];
    const tableColumns = [];
    const facetAggregations = [];
    // Process each field in the Elasticsearch mapping
    for (const [fieldName, field] of Object.entries(properties)) {
        // Skip fields with problematic characters that would cause GraphQL errors
        if (fieldName.includes(".") || fieldName.includes("-")) {
            logger_1.Logger.debug `Skipping field with problematic name: ${fieldName}`;
            continue;
        }
        const currentPath = [...parentPath, fieldName];
        const formattedFieldName = formatFieldName(currentPath);
        // Track if this is a submission_metadata field
        const isSubmissionMetadata = fieldName === "submission_metadata" ||
            currentPath.includes("submission_metadata");
        if (isSubmissionMetadata) {
            logger_1.Logger.debug `Processing submission_metadata field (will be hidden by default): ${fieldName}`;
        }
        // Store this field's type in the map for reference when building queries
        fieldTypeMap.set(formattedFieldName, field.type);
        // Add to extended fields with display name and isArray flag for nested arrays
        const extendedField = {
            displayName: formatDisplayName(formattedFieldName),
            fieldName: formattedFieldName,
        };
        // Add isArray property for nested type fields
        if (field.type === "nested") {
            extendedField.isArray = true;
        }
        extendedFields.push(extendedField);
        logger_1.Logger.debug `Added extended field: ${formattedFieldName}`;
        // Handle nested and object types
        if (field.type === "nested" || field.type === "object") {
            logger_1.Logger.debug `Processing nested/object field: ${formattedFieldName}`;
            // Skip adding nested/object fields to table columns
            // We only want primitive fields in the table
            logger_1.Logger.debug `Skipping table column for nested/object field: ${formattedFieldName}`;
            // Recursively process nested properties if they exist
            if (field.properties) {
                const nestedResults = processFields(field.properties, currentPath, fieldTypeMap);
                // Add the results from nested processing
                extendedFields.push(...nestedResults.extendedFields);
                tableColumns.push(...nestedResults.tableColumns);
                facetAggregations.push(...nestedResults.facetAggregations);
            }
        }
        // Process regular (non-object) fields
        else {
            // Add to table columns - primitive fields are sortable
            const tableColumn = {
                canChangeShow: true,
                fieldName: formattedFieldName,
                // Show if it's shallow enough in the tree and not submission_metadata
                show: isShallowField(currentPath, parentPath[0]) && !isSubmissionMetadata,
                sortable: true,
            };
            // Add special display type for size fields
            if (fieldName === "size" || fieldName.endsWith("_size")) {
                tableColumn.displayType = "bytes";
            }
            // Add jsonPath and query for nested fields (2+ segments)
            if (currentPath.length > 1) {
                const jsonPath = generateJsonPath(currentPath, fieldTypeMap);
                const query = generateGraphQLQuery(currentPath, fieldTypeMap);
                if (jsonPath && query) {
                    tableColumn.jsonPath = jsonPath;
                    tableColumn.query = query;
                }
            }
            tableColumns.push(tableColumn);
            logger_1.Logger.debug `Added table column: ${formattedFieldName}`;
            // Add to facet aggregations for searchable field types
            if (isSearchableField(field)) {
                const facetAggregation = {
                    active: !isSubmissionMetadata, // Not active if it's submission_metadata
                    fieldName: formatFacetFieldName(currentPath),
                    show: !isSubmissionMetadata, // Not shown if it's submission_metadata
                };
                facetAggregations.push(facetAggregation);
                logger_1.Logger.debug `Added facet: ${formatFacetFieldName(currentPath)} (active: ${!isSubmissionMetadata})`;
            }
        }
    }
    return { extendedFields, tableColumns, facetAggregations };
}
/**
 * Determines if a field should be displayed by default based on its path depth
 */
function isShallowField(path, containerField) {
    // Fields directly at the root level are shown
    if (path.length <= 2) {
        return true;
    }
    // Fields at the 3rd level are shown if under a container like 'data'
    if (path.length === 3 && isContainerField(containerField)) {
        return true;
    }
    // All other fields are hidden by default
    return false;
}
/**
 * Determines if a field is a container object (like 'data')
 */
function isContainerField(fieldName) {
    if (!fieldName)
        return false;
    // Only consider "data" as a container field
    return fieldName.toLowerCase() === "data";
}
/**
 * Determines if a field is searchable (can be used in facets)
 */
function isSearchableField(field) {
    return ["keyword", "text", "integer", "float", "date", "boolean"].includes(field.type);
}
/**
 * Main function to generate Arranger configurations from Elasticsearch mapping
 * Creates four configuration files:
 * - base.json: Basic index configuration
 * - extended.json: Field display names and metadata
 * - table.json: Table column configuration
 * - facets.json: Search facet configuration
 */
function ArrangerConfigs(mapping, indexName = "data", documentType = "file") {
    logger_1.Logger.info `Generating Arranger configs for index: ${indexName}`;
    logger_1.Logger.info `Document type: ${documentType}`;
    try {
        // Extract the mapping properties, preserving the structure
        let mappingProperties = mapping.mappings.properties;
        let basePath = [];
        // Create a map to store field types for reference during query generation
        const fieldTypeMap = new Map();
        // Store the initial mapping structure for better debugging
        logger_1.Logger.debugString("Analyzing initial mapping structure");
        // Find all field types from the Elasticsearch mapping and store them
        function recursivelyTrackFieldTypes(properties, path = []) {
            for (const [fieldName, field] of Object.entries(properties)) {
                const currentPath = [...path, fieldName];
                const formattedPath = currentPath.join(".");
                // Store this field's type
                fieldTypeMap.set(formattedPath, field.type);
                logger_1.Logger.debug `Field: ${formattedPath}, Type: ${field.type}`;
                // Recursively process nested properties
                if (field.properties) {
                    recursivelyTrackFieldTypes(field.properties, currentPath);
                }
            }
        }
        // Track field types for the entire mapping
        recursivelyTrackFieldTypes(mappingProperties);
        // Process all root-level fields, handling both data container and submission_metadata
        logger_1.Logger.info `Processing all root-level fields including data and submission_metadata`;
        // Combine results from processing all root-level fields
        let allExtendedFields = [];
        let allTableColumns = [];
        let allFacetAggregations = [];
        // Process each top-level field separately
        for (const [topFieldName, topField] of Object.entries(mappingProperties)) {
            if (topField.type === "object" && topField.properties) {
                logger_1.Logger.info `Processing top-level object field '${topFieldName}'`;
                // For container fields like 'data', process their nested properties with the container as base path
                if (isContainerField(topFieldName)) {
                    const { extendedFields, tableColumns, facetAggregations } = processFields(topField.properties, [topFieldName], fieldTypeMap);
                    allExtendedFields.push(...extendedFields);
                    allTableColumns.push(...tableColumns);
                    allFacetAggregations.push(...facetAggregations);
                }
                else {
                    // For non-container object fields (like submission_metadata), process them as root-level fields
                    const { extendedFields, tableColumns, facetAggregations } = processFields({ [topFieldName]: topField }, [], fieldTypeMap);
                    allExtendedFields.push(...extendedFields);
                    allTableColumns.push(...tableColumns);
                    allFacetAggregations.push(...facetAggregations);
                }
            }
            else {
                // Process primitive root-level fields
                const { extendedFields, tableColumns, facetAggregations } = processFields({ [topFieldName]: topField }, [], fieldTypeMap);
                allExtendedFields.push(...extendedFields);
                allTableColumns.push(...tableColumns);
                allFacetAggregations.push(...facetAggregations);
            }
        }
        logger_1.Logger.info `Generated ${allExtendedFields.length} extended fields`;
        logger_1.Logger.info `Generated ${allTableColumns.length} table columns`;
        logger_1.Logger.info `Generated ${allFacetAggregations.length} facet aggregations`;
        // Create configurations
        const configs = {
            base: {
                documentType,
                index: indexName,
            },
            extended: {
                extended: allExtendedFields,
            },
            table: {
                table: {
                    rowIdFieldName: "submission_metadata.submission_id",
                    columns: allTableColumns,
                },
            },
            facets: {
                facets: {
                    aggregations: allFacetAggregations,
                },
            },
        };
        logger_1.Logger.debugString("Configuration generated successfully");
        return configs;
    }
    catch (error) {
        logger_1.Logger.errorString("Error generating Arranger configurations");
        logger_1.Logger.errorString(`${error}`);
        throw error;
    }
}
//# sourceMappingURL=generateArrangerConfigs.js.map