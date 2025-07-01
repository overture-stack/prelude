-- PostgreSQL table creation script
-- Generated from CSV analysis
-- Table: demo_data
-- Columns: 23

CREATE TABLE IF NOT EXISTS demo_data (
  donor_id VARCHAR(50) NOT NULL,
  gender VARCHAR(50) NOT NULL,
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
  disease_status VARCHAR(50) NOT NULL
);

-- Table created for 23 columns
-- Sample data analysis: 51 rows
