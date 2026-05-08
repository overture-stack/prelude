-- PostgreSQL table creation script
-- Generated from CSV analysis
-- Table: expression
-- Columns: 10 (9 data + 1 submission_metadata)

CREATE TABLE IF NOT EXISTS expression (
  entrez_gene_id INTEGER,
  hugo_symbol VARCHAR(50),
  average_expression DECIMAL(20,6),
  number_of_tumour_samples INTEGER,
  cancer_type VARCHAR(50),
  dataset_name VARCHAR(50),
  is_oncogene VARCHAR(255),
  is_tumor_suppressor_gene VARCHAR(255),
  submission_metadata JSONB
);

-- Unique index on submission_id enables ON CONFLICT deduplication
DROP INDEX IF EXISTS idx_expression_submission_id;
CREATE UNIQUE INDEX IF NOT EXISTS idx_expression_submission_id
ON expression ((submission_metadata->>'submission_id'));

-- Table created for 10 columns (9 data + 1 submission_metadata)
-- Sample data analysis: 1 rows

-- JSONB submission_metadata usage examples:
-- INSERT: submission_metadata = '{"submission_id": "abc123", "source_file_name": "def456", "processed_at": "2025-09-03T21:04:07.761Z"}'
-- Query by submission_id: WHERE submission_metadata->>'submission_id' = 'abc123'
-- Query by hash: WHERE submission_metadata->>'source_file_name' = 'def456'
-- Query by date: WHERE (submission_metadata->>'processed_at')::timestamp > '2025-01-01'
