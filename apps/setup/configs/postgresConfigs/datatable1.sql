-- PostgreSQL table creation script
-- Generated from CSV analysis
-- Table: datatable1
-- Columns: 24 (23 data + 1 submission_metadata)

CREATE TABLE IF NOT EXISTS datatable1 (
  donor_id VARCHAR(50),
  gender VARCHAR(50),
  primary_site VARCHAR(50),
  vital_status VARCHAR(50),
  diagnosis_id VARCHAR(50),
  age_at_diagnosis SMALLINT,
  cancer_type VARCHAR(50),
  staging_system VARCHAR(50),
  stage VARCHAR(50),
  specimen_id VARCHAR(50),
  specimen_type VARCHAR(63),
  tissue_source VARCHAR(50),
  sample_id VARCHAR(50),
  sample_type VARCHAR(50),
  treatment_id VARCHAR(50),
  treatment_type VARCHAR(50),
  treatment_start SMALLINT,
  treatment_duration SMALLINT,
  treatment_response VARCHAR(50),
  drug_name VARCHAR(50),
  followup_id VARCHAR(50),
  followup_interval SMALLINT,
  disease_status VARCHAR(50),
  submission_metadata JSONB
);

-- Table created for 24 columns (23 data + 1 submission_metadata)
-- Sample data analysis: 51 rows

-- JSONB submission_metadata usage examples:
-- INSERT: submission_metadata = '{"submission_id": "abc123", "source_file_hash": "def456", "processed_at": "2025-09-03T21:04:07.761Z"}'
-- Query by submission_id: WHERE submission_metadata->>'submission_id' = 'abc123'
-- Query by hash: WHERE submission_metadata->>'source_file_hash' = 'def456'
-- Query by date: WHERE (submission_metadata->>'processed_at')::timestamp > '2025-01-01'
