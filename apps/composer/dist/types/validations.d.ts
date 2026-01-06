import { Profile } from "./cli";
/**
 * Configuration interface for path validation operations.
 * Defines the structure for various directory and file paths needed by different profiles.
 */
export interface PathValidationConfig {
    profile: Profile;
    outputPath?: string;
}
/**
 * Configuration options for CSV parsing operations.
 * These settings control how the parser handles various CSV formatting scenarios.
 */
export interface CSVParseOptions {
    delimiter: string;
    trim: boolean;
    skipEmptyLines: boolean;
    relax_column_count: boolean;
}
//# sourceMappingURL=validations.d.ts.map