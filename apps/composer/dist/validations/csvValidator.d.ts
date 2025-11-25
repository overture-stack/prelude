/**
 * Validates the header structure of a CSV file.
 * Reads the first line of the file and validates the headers.
 *
 * @param filePath - Path to the CSV file
 * @param delimiter - Character used to separate values in the CSV
 * @returns Promise resolving to true if headers are valid
 * @throws ComposerError if headers are invalid or file can't be read
 */
export declare function validateCSVHeaders(filePath: string, delimiter: string): Promise<boolean>;
//# sourceMappingURL=csvValidator.d.ts.map