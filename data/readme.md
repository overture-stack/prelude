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

# Setup Commands

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
