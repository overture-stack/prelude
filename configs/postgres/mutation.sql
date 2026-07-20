-- PostgreSQL table creation script
-- Generated from CSV analysis
-- Table: mutation
-- Columns: 17 (16 data + 1 submission_metadata)

CREATE TABLE IF NOT EXISTS mutation (
  hugo_symbol VARCHAR(50),
  entrez_gene_id INTEGER,
  number_of_samples_mutated_at_gene SMALLINT,
  total_number_of_mutated_samples SMALLINT,
  overall_mutation_frequency DECIMAL(10,2),
  cancer_type VARCHAR(50),
  number_of_samples_with_gains SMALLINT,
  number_of_samples_with_losses SMALLINT,
  total_number_of_samples SMALLINT,
  percent_of_samples_with_gains DECIMAL(10,2),
  percent_of_samples_with_losses DECIMAL(10,2),
  dataset_name VARCHAR(50),
  is_oncogene VARCHAR(255),
  is_tumor_suppressor_gene VARCHAR(255),
  submission_metadata JSONB
);

-- Unique index on submission_id enables ON CONFLICT deduplication
DROP INDEX IF EXISTS idx_mutation_submission_id;
CREATE UNIQUE INDEX IF NOT EXISTS idx_mutation_submission_id
ON mutation ((submission_metadata->>'submission_id'));

-- Table created for 17 columns (16 data + 1 submission_metadata)
-- Sample data analysis: 1 rows

-- JSONB submission_metadata usage examples:
-- INSERT: submission_metadata = '{"submission_id": "abc123", "source_file_name": "def456", "processed_at": "2025-09-03T21:04:07.761Z"}'
-- Query by submission_id: WHERE submission_metadata->>'submission_id' = 'abc123'
-- Query by hash: WHERE submission_metadata->>'source_file_name' = 'def456'
-- Query by date: WHERE (submission_metadata->>'processed_at')::timestamp > '2025-01-01'
