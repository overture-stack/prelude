# Postgres Commands

composer -p postgrestable -f ./data/correlationExample.csv --table-name correlation -o ./apps/setup/configs/postgresConfigs/correlation.sql
composer -p postgrestable -f ./data/expressionExample.csv --table-name expression -o ./apps/setup/configs/postgresConfigs/expression.sql
composer -p postgrestable -f ./data/mutationExample.csv --table-name mutation -o ./apps/setup/configs/postgresConfigs/mutation.sql
composer -p postgrestable -f ./data/proteinExample.csv --table-name protein -o ./apps/setup/configs/postgresConfigs/protein.sql

# Elasticsearch Commands

composer -p elasticsearchmapping -f ./data/correlationExample.csv -i correlation -o ./apps/setup/configs/elasticsearchConfigs/correlation-mapping.json

composer -p elasticsearchmapping -f ./data/expressionExample.csv -i expression -o ./apps/setup/configs/elasticsearchConfigs/expression-mapping.json

composer -p elasticsearchmapping -f ./data/mutationExample.csv -i mutation -o ./apps/setup/configs/elasticsearchConfigs/mutation-mapping.json

composer -p elasticsearchmapping -f ./data/proteinExample.csv -i protein -o ./apps/setup/configs/elasticsearchConfigs/protein-mapping.json

# Arranger Commands

composer -p arrangerconfigs -f ./apps/setup/configs/elasticsearchConfigs/correlation-mapping.json -o ./apps/setup/configs/arrangerconfigs/correlation -i correlation-index

composer -p arrangerconfigs -f ./apps/setup/configs/elasticsearchConfigs/protein-mapping.json -o ./apps/setup/configs/arrangerconfigs/protein -i protein-index

composer -p arrangerconfigs -f ./apps/setup/configs/elasticsearchConfigs/expression-mapping.json -o ./apps/setup/configs/arrangerconfigs/expression -i expression-index

composer -p arrangerconfigs -f ./apps/setup/configs/elasticsearchConfigs/mutation-mapping.json -o ./apps/setup/configs/arrangerconfigs/mutation -i mutation-index

# Upload Commands

conductor upload -f ./data/correlationExample.csv -t correlation -i correlation-index
conductor upload -f ./data/mutationExample.csv -t mutation -i mutation-index
conductor upload -f ./data/expressionExample.csv -t expression -i expression-index
conductor upload -f ./data/proteinExample.csv -t protein -i protein-index

# Setting up conductor globally

```
# Go to the platform directory
cd /data/softEng/ddp-v3.0-beta

# Make the script executable
chmod +x ./conductor.sh

# Install globally (requires sudo)
sudo ln -s "$(pwd)/conductor.sh" /usr/local/bin/conductor

# If you do not have sudo privileges, add this repo to your PATH:
echo "export PATH=\"$(pwd):\$PATH\"" >> ~/.bashrc
source ~/.bashrc
```
