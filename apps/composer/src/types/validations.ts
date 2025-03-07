import { Profile } from "./cli";

/**
 * Configuration interface for path validation operations.
 * Defines the structure for various directory and file paths needed by different profiles.
 */
export interface PathValidationConfig {
  profile: Profile; // The operation profile being used
  outputPath?: string; // Path where generated files will be saved
}

/**
 * Configuration options for CSV parsing operations.
 * These settings control how the parser handles various CSV formatting scenarios.
 */
export interface CSVParseOptions {
  delimiter: string; // Character used to separate values
  trim: boolean; // Remove whitespace from values
  skipEmptyLines: boolean; // Ignore empty lines in the CSV
  relax_column_count: boolean; // Allow rows with different column counts
}
