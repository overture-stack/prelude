# Initial Setup commands

A convenient list of the commands i used to initially generate configuration files using composer.

## Generate Postgres Config

composer -p postgrestable -f ./data/demodata.csv --table-name demo -o ./apps/setup/configs/postgresConfigs/demo.sql

## Generate Opensearch Config

composer -p elasticsearchmapping -f ./data/demodata.csv -i demo -o ./apps/setup/configs/elasticsearchConfigs/demo-mapping.json

## Generate Arranger Config

composer -p arrangerconfigs -f ./apps/setup/configs/opensearchConfigs/demo-mapping.json -o ./apps/setup/configs/arrangerconfigs/demo -i demo-index

## Upload Command

conductor upload -f ./data/demodata.csv -t demo -i demo-index
