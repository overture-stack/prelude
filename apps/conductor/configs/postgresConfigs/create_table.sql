-- PostgreSQL table creation script
-- Generated from CSV analysis
-- Table: datatable1
-- Columns: 23 + submission_metadata

CREATE TABLE IF NOT EXISTS datatable1 (
  donor VARCHAR(50) NOT NULL,
  sex VARCHAR(50) NOT NULL,
  primary_site VARCHAR(50) NOT NULL,
  vital_status VARCHAR(50) NOT NULL,
  diagnosis_id VARCHAR(50) NOT NULL,
  age_at_diagnosis SMALLINT NOT NULL,
  cancer_type VARCHAR(50) NOT NULL,
  staging_system VARCHAR(50) NOT NULL,
  stage VARCHAR(50) NOT NULL,
  specimen_id VARCHAR(50) NOT NULL,
  specimen_type VARCHAR(63) NOT NULL,
  tissue_source VARCHAR(50) NOT NULL,
  sample_id VARCHAR(50) NOT NULL,
  sample_type VARCHAR(50) NOT NULL,
  treatment_id VARCHAR(50) NOT NULL,
  treatment_type VARCHAR(50) NOT NULL,
  treatment_start SMALLINT NOT NULL,
  treatment_duration SMALLINT NOT NULL,
  treatment_response VARCHAR(50) NOT NULL,
  drug_name VARCHAR(50) NOT NULL,
  followup_id VARCHAR(50) NOT NULL,
  followup_interval SMALLINT NOT NULL,
  disease_status VARCHAR(50) NOT NULL,

  -- Simplified submission metadata (just ID, hash, timestamp)
  submission_metadata JSONB
);

-- Add index for submission_id queries
CREATE INDEX IF NOT EXISTS idx_datatable1_submission_id 
ON datatable1 ((submission_metadata->>'submission_id'));

-- Table created for 23 data columns + 1 metadata column
-- Sample data analysis: 100 rows

-- Example queries:
-- SELECT * FROM datatable1 WHERE submission_metadata->>'submission_id' = 'your_submission_id';
-- SELECT submission_metadata->>'source_file_hash' as file_hash FROM datatable1;
-- SELECT submission_metadata->>'processed_at' as processed_date FROM datatable1;
