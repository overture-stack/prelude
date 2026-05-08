-- PostgreSQL table creation script
-- Generated from CSV analysis
-- Table: correlation
-- Columns: 19

CREATE TABLE IF NOT EXISTS correlation (
  n INTEGER,
  hugo_symbol_a VARCHAR(50),
  entrez_gene_id_a INTEGER,
  hugo_symbol_b VARCHAR(50),
  entrez_gene_id_b INTEGER,
  spearmancorr DECIMAL(20,6),
  spearmanp DECIMAL(20,6),
  pearsoncorr DECIMAL(20,6),
  pearsonp DECIMAL(20,6),
  spearmancorrsquare DECIMAL(20,6),
  pearsoncorrsquare DECIMAL(20,6),
  cancer_type VARCHAR(50),
  dataset_name VARCHAR(50),
  is_oncogene_a VARCHAR(255),
  is_tumor_suppressor_gene_a VARCHAR(255),
  is_oncogene_b VARCHAR(255),
  is_tumor_suppressor_gene_b VARCHAR(255),
  submission_metadata JSONB
);

-- Unique index on submission_id enables ON CONFLICT deduplication
DROP INDEX IF EXISTS idx_correlation_submission_id;
CREATE UNIQUE INDEX IF NOT EXISTS idx_correlation_submission_id
ON correlation ((submission_metadata->>'submission_id'));

-- Table created for 9 data columns + 1 metadata column
-- Sample data analysis: 1 rows

-- Example queries:
-- SELECT * FROM expressionexample WHERE submission_metadata->>'submission_id' = 'your_submission_id';
-- SELECT submission_metadata->>'source_file_name' as file_hash FROM expressionexample;
-- SELECT submission_metadata->>'processed_at' as processed_date FROM expressionexample;
