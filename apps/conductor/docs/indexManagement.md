# Elasticsearch Index Management

## Overview

The Index Management feature provides a command-line interface for creating and managing Elasticsearch indices and templates. It allows users to define index mapping templates and create indices that conform to these templates, making it easy to maintain consistent data structures across your Elasticsearch cluster.

## Key Features

- Create and manage Elasticsearch index templates
- Automatically generate indices that match template patterns
- Smart handling of aliases defined in templates
- Support for command-line options and configuration files
- Comprehensive error handling and logging

## Command-Line Usage

```bash
conductor indexManagement --template-file <template.json> [options]
```

### Required Parameters

- `--template-file, -t`: Path to the JSON template file

### Optional Parameters

- `--template-name, -n`: Custom name for the template (default: auto-generated)
- `--index-name, -i`: Custom name for the index (default: derived from template pattern)
- `--alias, -a`: Custom alias for the index (default: from template or indexed-name-alias)
- `--url, -u`: Elasticsearch URL (default: from config or localhost:9200)
- `--username`: Elasticsearch username (default: elastic)
- `--password`: Elasticsearch password (default: myelasticpassword)
- `--force`: Skip confirmation prompts (default: false)
- `--output, -o`: Output directory for results
- `--debug`: Enable debug logging

## Template File Format

The template file should be a valid Elasticsearch index template in JSON format. Here's an example:

```json
{
  "index_patterns": ["tabular-*"],
  "aliases": {
    "tabular-index_centric": {}
  },
  "mappings": {
    "properties": {
      "field1": { "type": "keyword" },
      "field2": { "type": "integer" }
    }
  },
  "settings": {
    "number_of_shards": 1,
    "number_of_replicas": 0
  }
}
```

Key components:

- `index_patterns`: Patterns that indices must match for the template to apply
- `aliases`: Default aliases for the indices
- `mappings`: Field definitions and data types
- `settings`: Index configuration settings

## Architecture

The Index Management feature follows a modular architecture with clear separation of concerns:

### Command Layer

The `IndexManagementCommand` class extends the abstract `Command` base class and provides the entry point for the feature. It:

1. Parses command-line arguments
2. Loads and analyzes the template file
3. Orchestrates the creation of templates and indices
4. Reports success or failure to the CLI

### Service Layer

The feature uses specialized service modules in the `services/elasticsearch/` directory:

- `client.ts`: Handles client creation and connection management
- `templates.ts`: Provides functions for template operations
- `indices.ts`: Manages index operations

Each service module contains focused, pure functions that handle specific aspects of Elasticsearch interaction.

### Helper Functions

A key component is the `extractTemplateInfo` function that analyzes a template to:

- Extract index patterns and convert them to valid index names
- Find aliases defined in the template
- Extract settings like number of shards and replicas

This allows the command to make intelligent decisions about defaults.

## Code Walkthrough

### Command Execution Flow

1. **Template Loading**: The command loads and parses the template file

   ```typescript
   const rawContent = fs.readFileSync(templateFile, "utf-8");
   templateContent = JSON.parse(rawContent);
   ```

2. **Template Analysis**: The template is analyzed to extract useful information

   ```typescript
   const templateInfo = extractTemplateInfo(templateContent);
   ```

3. **Name Resolution**: Index and alias names are determined using a priority system

   ```typescript
   const indexName =
     options.indexName ||
     config.elasticsearch?.index ||
     templateInfo.defaultIndexName ||
     `index-${Date.now()}`;
   ```

4. **Connection**: An Elasticsearch client is created and connection is validated

   ```typescript
   const client = createClientFromConfig(config);
   await validateConnection(client);
   ```

5. **Template Creation**: The template is created if it doesn't exist

   ```typescript
   const isTemplateExists = await templateExists(client, templateName);
   if (!isTemplateExists) {
     await createTemplate(client, templateName, templateContent);
   }
   ```

6. **Index Creation**: An index is created with the appropriate alias
   ```typescript
   const isIndexExists = await indexExists(client, indexName);
   if (!isIndexExists) {
     await createIndex(client, indexName, indexSettings);
   }
   ```

### Template Analysis

The `extractTemplateInfo` function analyzes a template to extract useful information:

```typescript
export function extractTemplateInfo(
  templateBody: Record<string, any>
): TemplateInfo {
  const info: TemplateInfo = {};

  // Extract default index name from index patterns
  if (
    templateBody.index_patterns &&
    Array.isArray(templateBody.index_patterns)
  ) {
    const pattern = templateBody.index_patterns[0];
    info.defaultIndexName = pattern.replace(/\*$/, Date.now());
  }

  // Extract default alias from aliases
  if (templateBody.aliases && typeof templateBody.aliases === "object") {
    const aliasNames = Object.keys(templateBody.aliases);
    if (aliasNames.length > 0) {
      info.defaultAliasName = aliasNames[0];
    }
  }

  // Extract settings
  if (templateBody.settings) {
    if (templateBody.settings.number_of_shards) {
      info.numberOfShards = parseInt(
        templateBody.settings.number_of_shards,
        10
      );
    }

    if (templateBody.settings.number_of_replicas) {
      info.numberOfReplicas = parseInt(
        templateBody.settings.number_of_replicas,
        10
      );
    }
  }

  return info;
}
```

## Error Handling

The feature implements comprehensive error handling:

1. **Template File Errors**: Checks if the file exists and contains valid JSON
2. **Connection Errors**: Provides specific guidance for connection issues
3. **Template Creation Errors**: Detailed error messages for template operations
4. **Index Creation Errors**: Clear reporting of index creation failures

All errors are wrapped in a `ConductorError` with appropriate error codes for consistent handling.

## Extending the Feature

To extend this feature:

1. **Add New Template Operations**: Add functions to `templates.ts`
2. **Support New Index Operations**: Add functions to `indices.ts`
3. **Add CLI Options**: Update `configureCommandOptions` in `cli/options.ts`
4. **Add New Template Analysis**: Enhance the `extractTemplateInfo` function

## Best Practices

When working with this code:

1. **Maintain Separation of Concerns**: Keep service functions pure and focused
2. **Prioritize Error Handling**: Always provide meaningful error messages
3. **Use TypeScript Interfaces**: Define clear interfaces for inputs and outputs
4. **Log Extensively**: Use consistent logging for better observability
5. **Follow Command Pattern**: Extend the base Command class for new commands

## Testing

For testing the feature:

```bash
# Create a template and index
conductor indexManagement --template-file ./templates/my-mapping.json

# Create with custom names
conductor indexManagement --template-file ./templates/my-mapping.json --template-name my-template --index-name my-index --alias my-alias
```

## Troubleshooting

Common issues and solutions:

1. **Authentication Failures**: Ensure username and password are correct
2. **Template Parsing Errors**: Validate JSON syntax in the template file
3. **Index Name Conflicts**: Check if indices with similar names already exist
4. **Pattern Matching Issues**: Ensure index names match the patterns in templates
