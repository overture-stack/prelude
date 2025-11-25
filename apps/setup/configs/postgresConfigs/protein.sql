-- PostgreSQL table creation script
-- Generated from CSV analysis
-- Table: protein
-- Columns: 24 (23 data + 1 submission_metadata)

CREATE TABLE IF NOT EXISTS protein (
  hugo_symbol_a VARCHAR(50),
  hugo_symbol_b VARCHAR(50),
  neighborhood VARCHAR(50),
  neighborhood_transferred VARCHAR(50),
  fusion VARCHAR(50),
  cooccurence VARCHAR(50),
  homology VARCHAR(50),
  coexpression SMALLINT,
  coexpression_transferred SMALLINT,
  experiments VARCHAR(50),
  experiments_transferred VARCHAR(50),
  database VARCHAR(50),
  database_transferred VARCHAR(50),
  textmining SMALLINT,
  textmining_transferred SMALLINT,
  combined_score SMALLINT,
  dataset_name VARCHAR(50),
  is_oncogene_a VARCHAR(255),
  is_tumor_suppressor_gene_a VARCHAR(255),
  is_oncogene_b VARCHAR(255),
  is_tumor_suppressor_gene_b VARCHAR(255),
  is_wdr_a VARCHAR(50),
  is_wdr_b VARCHAR(50),
  submission_metadata JSONB
);

-- Table created for 24 columns (23 data + 1 submission_metadata)
-- Sample data analysis: 1 rows

-- JSONB submission_metadata usage examples:
-- INSERT: submission_metadata = '{"submission_id": "abc123", "source_file_hash": "def456", "processed_at": "2025-09-03T21:04:07.761Z"}'
-- Query by submission_id: WHERE submission_metadata->>'submission_id' = 'abc123'
-- Query by hash: WHERE submission_metadata->>'source_file_hash' = 'def456'
-- Query by date: WHERE (submission_metadata->>'processed_at')::timestamp > '2025-01-01'
