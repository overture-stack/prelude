# Data Folder

This folder is for storing data files used in your project. Below are guidelines
for optimal data management:

## File Format

- The composer supports configurable delimiters, but CSV (Comma-Separated
  Values) is the recommended format for tabular data
- Include headers in your CSV files for clear column identification your
  elasticsearch index mapping should match these field names

## Data Security

- If storing sensitive data, add your data files to `.gitignore` before
  committing to GitHub
- If pushing data files to github review them for any personally identifiable
  information (PII) before committing

## Dataset Size

- Use representative sample datasets of approximately 500 records for
  development and testing
- No strict minimum or maximum size limits exist beyond Docker and Elasticsearch
  resource constraints

# Setup Commands Phase 1

composer -p ArrangerConfigs -f ./configs/elasticsearchConfigs/geneCorrelation.json -o ./configs/arrangerConfigs/geneCorrelations/ -i correlation_centric
composer -p ArrangerConfigs -f ./configs/elasticsearchConfigs/proteinInteractions.json -o ./configs/arrangerConfigs/proteinInteractions/  -i protein_centric
composer -p ArrangerConfigs -f ./configs/elasticsearchConfigs/geneMutations.json -o ./configs/arrangerConfigs/geneMutations/  -i mutation_centric
composer -p ArrangerConfigs -f ./configs/elasticsearchConfigs/geneExpression.json -o ./configs/arrangerConfigs/geneExpression/  -i mrna_centric

conductor upload -f ./data/protein.csv -i protein-index
conductor upload -f ./data/mrna.csv -i mrna-index
conductor upload -f ./data/correlation.csv -i correlation-index
conductor upload -f ./data/mutation.csv -i mutation-index

# Setup Commands Phase 2
 
conductor lecternUpload -s ./configs/lecternDictionaries/drugDiscoveryDictionary.json

conductor lyricRegister -c correlations --dict-name drugDiscoveryDictionary -v 1.0 -e genecorrelations
conductor lyricRegister -c mutations --dict-name drugDiscoveryDictionary -v 1.0 -e genemutations
conductor lyricRegister -c expression --dict-name drugDiscoveryDictionary -v 1.0 -e geneexpression
conductor lyricRegister -c protein --dict-name drugDiscoveryDictionary -v 1.0 -e proteininteractions

conductor lyricUpload -d ./data/genecorrelations.csv -c 1
conductor lyricUpload -d ./data/genemutations.csv -c 2
conductor lyricUpload -d ./data/geneexpression.csv -c 3
conductor lyricUpload -d ./data/proteininteractions.csv - 4

conductor maestroIndex --repository-code correlation
conductor maestroIndex --repository-code mutation
conductor maestroIndex --repository-code expression
conductor maestroIndex --repository-code protein
