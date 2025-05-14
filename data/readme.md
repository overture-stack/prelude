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

### The following below does not work, when submitting it only knows geneCorrelations to exist

    conductor lecternUpload -s ./configs/lecternDictionaries/geneCorrelations.json
    conductor lecternUpload -s ./configs/lecternDictionaries/geneExpression.json
    conductor lecternUpload -s ./configs/lecternDictionaries/geneMutations.json
    conductor lecternUpload -s ./configs/lecternDictionaries/proteinInteractions.json


    conductor lyricRegister -c correlations --dict-name geneCorrelations -v 1.0 -e genecorrelations
    conductor lyricRegister -c mutations --dict-name geneMutations -v 1.0 -e genemutations
    conductor lyricRegister -c expression --dict-name geneExpression -v 1.0 -e geneexpression
    conductor lyricRegister -c protein --dict-name proteinInteractions -v 1.0 -e proteininteractions

#### So i tried this, one dictionary

conductor lecternUpload -s ./configs/lecternDictionaries/drugDiscoveryDictionaryV2.json

#### then registered each with the relevant table schema as the centric entity

conductor lyricRegister -c correlations --dict-name drugDiscoveryDictionary -v 1.0 -e genecorrelations
conductor lyricRegister -c mutations --dict-name drugDiscoveryDictionary -v 1.0 -e genemutations
conductor lyricRegister -c expression --dict-name drugDiscoveryDictionary -v 1.0 -e geneexpression
conductor lyricRegister -c protein --dict-name drugDiscoveryDictionary -v 1.0 -e proteininteractions

These work
conductor lyricUpload -d ./data/genecorrelations.csv -c 1
conductor lyricUpload -d ./data/geneexpression.csv -c 3

These silently fail nothing seemingly wrong with the csvs
conductor lyricUpload -d ./data/genemutations.csv -c 2
conductor lyricUpload -d ./data/proteininteractions.csv -c 4
`2025-05-14T00:18:27.216Z [error]: There was an error processing files: genemutations - {"records":[],"errors":[]}`

Solution: This occurs due to 

conductor maestroIndex --repository-code correlation
conductor maestroIndex --repository-code mutation
conductor maestroIndex --repository-code mrna
conductor maestroIndex --repository-code protein

# CSV Format Validation Error: Trailing Commas and Missing Fields

## Issue Description

The data import system is silently failing due to CSV formatting issues in the `genemutations.csv` and `proteininteractions.csv` files. Analysis of the file structure revealed two problems:

1. **Trailing commas** at the end of data rows (after the last field)
2. **Missing field values** for several required columns

## Example of Problematic Data

### proteininteractions.csv (incorrect format):
```
Hugo_Symbol_A,Hugo_Symbol_B,...,combined_score,Is_Oncogene,Is_Tumor_Suppressor_Gene,Is_WDR,dataset_name
CD81,ISG15,...,281,--,,
```

### genemutations.csv (incorrect format):
```
Hugo_Symbol,...,Is_Oncogene,Is_Tumor_Suppressor_Gene,Is_WDR
KIAA1644,...,NA,NA
```

## Solution Implemented

Fixed the CSV formatting to ensure:
1. Removed all trailing commas at the end of rows
2. Added placeholder values (`--`) for all missing fields
3. Verified the field count in each row matches the header column count

### Corrected Format Example:
```
Hugo_Symbol_A,Hugo_Symbol_B,...,combined_score,Is_Oncogene,Is_Tumor_Suppressor_Gene,Is_WDR,dataset_name
CD81,ISG15,...,281,--,--,--,--
```

## Technical Details

The validation system requires exact field count matching between schema definition and data rows. The trailing commas were likely interpreted as undefined additional fields, while missing values at row ends caused field count mismatches with the schema.

This formatting issue is particularly problematic as it results in silent failures rather than explicit error messages, making debugging challenging.

## Prevention Recommendations

1. Add explicit CSV validation with detailed error reporting to the submission system
2. Implement a pre-submission CSV validator tool
3. Document CSV formatting requirements with examples for future submissions