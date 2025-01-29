# Configuration Directory

This directory contains configuration files for Elasticsearch indices and
Arranger components. The configurations are organized to support both a file and
a tabular data exploration page.

## Directory Structure

```
configs/
├── arrangerConfigs/
│   ├── fileDataConfigs/      # Configs for file data explorer
│   └── tabularDataConfigs/   # Configs for tabular data explorer
├── elasticsearchConfigs/
│   ├── file_data_index_template.json
│   └── tabular_data_index_template.json
└── readme.md
```

## Arranger Configs (`arrangerConfigs/`)

### Tabular & File Data Configs

Contains configuration files for the tabular and file data exploration table and
facets:

- `base.json` - Core settings including document type and index name
- `extended.json` - Field mappings and display properties
- `table.json` - Data table layout and column settings
- `facets.json` - Search facet configurations

For more information see our
[data portal customization guide](https://docs.overture.bio/guides/administration-guides/customizing-the-data-portal)

## Elasticsearch Configs (`elasticsearchConfigs/`)

Contains index templates that define how documents and fields are stored and
indexed in Elasticsearch. For detailed configuration information, refer to our
[index mappings documentation](https://docs.overture.bio/guides/administration-guides/index-mappings)

**Note:** This configuration setup uses Elasticsearch 7.x. Ensure all
configurations follow Elasticsearch 7 syntax and conventions.
