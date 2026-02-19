# Workshop Cheatsheet

Quick reference for all commands, paths, ports, and credentials used in this workshop.

---

## Credentials

| Service | Username | Password |
|---------|----------|----------|
| Elasticsearch | `elastic` | `myelasticpassword` |
| PostgreSQL | `admin` | `admin123` |

---

## Ports

| Service | URL |
|---------|-----|
| Stage (portal) | http://localhost:3000 |
| Arranger (search API) | http://localhost:5050 |
| Elasticsearch | http://localhost:9200 |
| PostgreSQL | localhost:5435 |

---

## Make Commands

```bash
make demo       # Start with sample data pre-loaded
make platform   # Start platform (upload your own data)
make down       # Stop all containers
make restart    # Restart platform containers (keeps data)
make reset      # Stop + delete all data and volumes
make nuke       # Delete everything including images
```

---

## Composer (config generation)

**Install:**
```bash
cd apps/composer && npm install && npm run build && npm install -g .
cd ../..
```

**Generate Elasticsearch mapping:**
```bash
composer -p ElasticsearchMapping \
  -f ./data/datatable1.csv \
  -i datatable1 \
  -o ./setup/configs/elasticsearchConfigs/datatable1-mapping.json
```

**Generate Arranger configs:**
```bash
composer -p ArrangerConfigs \
  -f ./setup/configs/elasticsearchConfigs/datatable1-mapping.json \
  -o ./setup/configs/arrangerConfigs/datatable1/
```

---

## Conductor (data upload)

**Install:**
```bash
cd apps/conductor && npm install && npm run build && npm install -g .
cd ../..
```

**Upload data:**
```bash
conductor upload -f ./data/datatable1.csv -t datatable1 -i datatable1-index
```

---

## Key File Paths

| File | Purpose |
|------|---------|
| `docker-compose.yml` | Service orchestration and environment variables |
| `data/datatable1.csv` | Input data |
| `setup/configs/elasticsearchConfigs/datatable1-mapping.json` | Elasticsearch index mapping |
| `setup/configs/arrangerConfigs/datatable1/base.json` | Arranger index reference |
| `setup/configs/arrangerConfigs/datatable1/extended.json` | Field display names |
| `setup/configs/arrangerConfigs/datatable1/table.json` | Table column config |
| `setup/configs/arrangerConfigs/datatable1/facets.json` | Filter panel config |
| `apps/stage/components/theme/` | Theme colors and typography |
| `apps/stage/public/images/` | Logo and favicon |

---

## Elasticsearch Queries

```bash
# Check cluster health
curl -u elastic:myelasticpassword http://localhost:9200/_cluster/health?pretty

# List all indices
curl -u elastic:myelasticpassword http://localhost:9200/_cat/indices?v

# Count documents in index
curl -u elastic:myelasticpassword http://localhost:9200/datatable1_centric/_count?pretty

# View a sample document
curl -u elastic:myelasticpassword "http://localhost:9200/datatable1_centric/_search?pretty&size=1"

# Delete an index (for re-upload)
curl -u elastic:myelasticpassword -X DELETE "http://localhost:9200/datatable1-index"
```

---

## Docker Troubleshooting

```bash
# Check running containers
docker ps

# Check all containers (including stopped)
docker ps -a

# View container logs
docker logs setup
docker logs arranger-datatable1
docker logs stage
docker logs elasticsearch
docker logs postgres

# Check Docker resource usage
docker stats --no-stream
```

---

## Config Quick Edits

**Change portal name:**
In `docker-compose.yml`, update:
```yaml
NEXT_PUBLIC_LAB_NAME: Your Lab Name
```

**Hide a facet filter:**
In `setup/configs/arrangerConfigs/datatable1/facets.json`, set:
```json
{ "fieldName": "data.field_name", "active": true, "show": false }
```

**Hide a table column:**
In `setup/configs/arrangerConfigs/datatable1/table.json`, set:
```json
{ "fieldName": "data.field_name", "show": false }
```

**Change a field display name:**
In `setup/configs/arrangerConfigs/datatable1/extended.json`, update:
```json
{ "fieldName": "data.age_at_diagnosis", "displayName": "Age at Diagnosis" }
```

**Update base.json index alias:**
```json
{ "documentType": "file", "index": "datatable1_centric" }
```

---

## Adding a Second Data Table

1. Generate configs for your second CSV
2. Add to `docker-compose.yml`:
   - Increment `ES_INDEX_COUNT` and add `ES_INDEX_1_*` vars in setup service
   - Add `ARRANGER_1_URL` and increment `ARRANGER_COUNT` in setup service
   - Add new `arranger-datatable2` service (port `5051`)
   - Add `NEXT_PUBLIC_ARRANGER_DATATABLE_2_*` vars in stage service
3. Add data table component and page route in Stage
4. `make restart`
5. Upload: `conductor upload -f ./data/datatable2.csv -i datatable2-index`

---

## Adapting to Your Own Data

```bash
# 1. Place your CSV in data/
cp yourdata.csv data/

# 2. Generate Elasticsearch mapping
composer -p ElasticsearchMapping -f ./data/yourdata.csv -i yourdata \
  -o ./setup/configs/elasticsearchConfigs/yourdata-mapping.json

# 3. Generate Arranger configs
composer -p ArrangerConfigs \
  -f ./setup/configs/elasticsearchConfigs/yourdata-mapping.json \
  -o ./setup/configs/arrangerConfigs/yourdata/

# 4. Update base.json index to use the alias
# 5. Review extended.json, table.json, facets.json
# 6. Update docker-compose.yml with new index/arranger/stage vars
# 7. Restart and upload
make restart
conductor upload -f ./data/yourdata.csv -t yourdata -i yourdata-index
```
