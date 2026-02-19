# Next Steps

## What You Built

You now have a locally running data discovery portal with:

- **Postgres:** a database to store persistent data
- **Elasticsearch** indexing your tabular data with typed field mappings
- **Arranger** providing a GraphQL search API and configurable UI components
- **Stage** rendering a browser-based portal with faceted search, sortable tables, and data export

You've seen how to:

- Generate configuration files from CSV data using Composer
- Wire services together through Docker Compose
- Load data with Conductor
- Customize the portal's search interface and appearance
- Understand the deployment architecture for making portals network-accessible

## Adapting to Your Own Data

If you brought your own CSV file, here's the workflow to configure the portal for it:

### 1. Prepare your CSV

Ensure your file follows the conventions from the [Data Preparation](04-Data-Preparation) section:

- Valid headers (snake_case, no prohibited characters)
- Consistent formatting
- Place the file in the `data/` directory

### 2. Generate configurations

```bash
# Generate Elasticsearch mapping
composer -p ElasticsearchMapping -f ./data/yourdata.csv -i yourdata -o ./setup/configs/elasticsearchConfigs/yourdata-mapping.json

# Generate Arranger configs
composer -p ArrangerConfigs -f ./setup/configs/elasticsearchConfigs/yourdata-mapping.json -o ./setup/configs/arrangerConfigs/yourdata/
```

### 3. Review and customize

- Check field types in the Elasticsearch mapping
- Update `base.json` with the correct index alias
- Adjust display names in `extended.json`
- Configure which facets and columns to show in `facets.json` and `table.json`

### 4. Update Docker configuration

Modify `docker-compose.yml` to reference your new index, config files, and data file. Follow the patterns described in the [Docker Configuration](06-Docker-Configuration) section.

### 5. Deploy and load

```bash
make restart
conductor upload -f ./data/yourdata.csv -t yourdata -i yourdata-index
```

## Expanding the Platform

The search and exploration stack used in this workshop is part of the broader Overture platform. Depending on your needs, you can extend it with:

| Need                       | Overture Service | What It Does                                                       |
| -------------------------- | ---------------- | ------------------------------------------------------------------ |
| Enforce data schemas       | **Lectern**      | Define and manage data dictionaries that validate submissions      |
| Accept tabular submissions | **Lyric**        | Structured data submission with validation against Lectern schemas |
| Manage file metadata       | **Song**         | Track and validate files with analysis schemas                     |
| Store and transfer files   | **Score**        | Object storage integration (S3, Azure Blob, etc.)                  |
| Automate indexing          | **Maestro**      | Event-driven indexing from Song/Lyric into Elasticsearch           |

These services compose together, letting you build from a simple search portal to a full data management platform incrementally.

For more information, see the [Overture documentation](https://docs.overture.bio).

## Useful Commands Reference

```bash
# Start the demo portal
make demo

# Stop all services
make down

# Restart with fresh configuration (preserves data)
make restart

# Full reset (removes all data and volumes)
make reset

# Remove everything including Docker images
make nuke

# Check running containers
docker ps

# View container logs
docker logs <container-name>

# Query Elasticsearch
curl -u elastic:myelasticpassword http://localhost:9200/_cat/indices?v

# Upload data
conductor upload -f ./data/yourfile.csv -t your-table-name -i your-index-name
```

## Resources

- **Overture Documentation:** [docs.overture.bio](https://docs.overture.bio)
- **Overture GitHub:** [github.com/overture-stack](https://github.com/overture-stack)
- **Arranger Docs:** [Arranger overview](https://docs.overture.bio/docs/core-software/arranger/overview/)
- **Stage Docs:** [Stage overview](https://docs.overture.bio/docs/core-software/stage/overview/)
- **Elasticsearch 7.17 Reference:** [elastic.co/guide](https://www.elastic.co/guide/en/elasticsearch/reference/7.17/index.html)
- **Elasticvue:** [elasticvue.com](https://elasticvue.com/installation)

## Support

- **Community Discussions:** [GitHub Discussions](https://github.com/overture-stack/prelude/discussions)
- **Bug Reports:** [GitHub Issues](https://github.com/overture-stack/prelude/issues)
- **Email:** [contact@overture.bio](mailto:contact@overture.bio)

## Workshop Contact

**Mitchell Shiell**
Ontario Institute for Cancer Research
[mshiell@oicr.on.ca](mailto:mshiell@oicr.on.ca)
