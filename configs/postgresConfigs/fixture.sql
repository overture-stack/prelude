-- PostgreSQL table creation script
-- Generated from CSV analysis
-- Table: fixture
-- Columns: 24 (23 data + 1 submission_metadata)

CREATE TABLE IF NOT EXISTS fixture (
  hugo_symbol_a VARCHAR(50),
  hugo_symbol_b VARCHAR(50),
  neighborhood SMALLINT,
  neighborhood_transferred SMALLINT,
  fusion SMALLINT,
  cooccurence SMALLINT,
  homology SMALLINT,
  coexpression SMALLINT,
  coexpression_transferred SMALLINT,
  experiments SMALLINT,
  experiments_transferred SMALLINT,
  database SMALLINT,
  database_transferred SMALLINT,
  textmining SMALLINT,
  textmining_transferred SMALLINT,
  combined_score SMALLINT,
  dataset_name VARCHAR(50),
  is_oncogene_a VARCHAR(255),
  is_tumor_suppressor_gene_a VARCHAR(255),
  is_oncogene_b VARCHAR(255),
  is_tumor_suppressor_gene_b VARCHAR(255),
  submission_metadata JSONB
);

-- Unique index on submission_id enables ON CONFLICT deduplication
DROP INDEX IF EXISTS idx_fixture_submission_id;
CREATE UNIQUE INDEX IF NOT EXISTS idx_fixture_submission_id
ON fixture ((submission_metadata->>'submission_id'));

-- Table created for 24 columns (23 data + 1 submission_metadata)
-- Sample data analysis: 1 rows

-- JSONB submission_metadata usage examples:
-- INSERT: submission_metadata = '{"submission_id": "abc123", "source_file_name": "def456", "processed_at": "2025-09-03T21:04:07.761Z"}'
-- Query by submission_id: WHERE submission_metadata->>'submission_id' = 'abc123'
-- Query by hash: WHERE submission_metadata->>'source_file_name' = 'def456'
-- Query by date: WHERE (submission_metadata->>'processed_at')::timestamp > '2025-01-01'
