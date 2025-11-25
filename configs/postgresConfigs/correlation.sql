-- PostgreSQL table creation script
-- Generated from CSV analysis
-- Table: correlation
-- Columns: 19

CREATE TABLE IF NOT EXISTS correlation (
  n SMALLINT,
  hugo_symbol_a VARCHAR(50),
  entrez_gene_id_a VARCHAR(50),
  hugo_symbol_b VARCHAR(50),
  entrez_gene_id_b INTEGER,
  spearmancorr DECIMAL(10,3),
  spearmanp VARCHAR(50),
  pearsoncorr DECIMAL(10,3),
  pearsonp VARCHAR(50),
  spearmancorrsquare DECIMAL(10,3),
  pearsoncorrsquare DECIMAL(10,3),
  cancer_type VARCHAR(50),
  dataset_name VARCHAR(50),
  is_oncogene_a VARCHAR(255),
  is_tumor_suppressor_gene_a VARCHAR(255),
  is_oncogene_b VARCHAR(255),
  is_tumor_suppressor_gene_b VARCHAR(255),
  is_wdr_a VARCHAR(50),
  is_wdr_b VARCHAR(50),
  submission_metadata JSONB
);

-- Add index for submission_id queries
CREATE INDEX IF NOT EXISTS idx_correlation_submission_id 
ON correlation ((submission_metadata->>'submission_id'));

-- Table created for 9 data columns + 1 metadata column
-- Sample data analysis: 1 rows

-- Example queries:
-- SELECT * FROM expressionexample WHERE submission_metadata->>'submission_id' = 'your_submission_id';
-- SELECT submission_metadata->>'source_file_hash' as file_hash FROM expressionexample;
-- SELECT submission_metadata->>'processed_at' as processed_date FROM expressionexample;
