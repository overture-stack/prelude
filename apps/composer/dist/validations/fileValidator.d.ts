/**
 * Performs comprehensive validation of a file:
 * - Checks if file exists
 * - Verifies parent directory exists
 * - Confirms file is readable
 * - Ensures file is not empty
 *
 * @param filePath - Path to the file to validate
 * @returns Promise resolving to true if file is valid
 * @throws ComposerError for any validation failures
 */
export declare function validateFile(filePath: string): Promise<boolean>;
/**
 * Validates that the CSV delimiter is a single character.
 *
 * @param delimiter - Character to be used as CSV delimiter
 * @returns true if delimiter is valid
 * @throws ComposerError if delimiter is invalid
 */
export declare function validateDelimiter(delimiter: string): boolean;
//# sourceMappingURL=fileValidator.d.ts.map