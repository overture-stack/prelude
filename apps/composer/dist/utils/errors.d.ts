export declare class ComposerError extends Error {
    code: string;
    details?: any | undefined;
    suggestions?: string[] | undefined;
    constructor(message: string, code: string, details?: any | undefined, suggestions?: string[] | undefined);
    toString(): string;
}
export declare const ErrorCodes: {
    readonly INVALID_ARGS: "INVALID_ARGS";
    readonly FILE_NOT_FOUND: "FILE_NOT_FOUND";
    readonly INVALID_FILE: "INVALID_FILE";
    readonly VALIDATION_FAILED: "VALIDATION_FAILED";
    readonly ENV_ERROR: "ENV_ERROR";
    readonly GENERATION_FAILED: "GENERATION_FAILED";
    readonly PARSING_ERROR: "PARSING_ERROR";
    readonly FILE_ERROR: "FILE_ERROR";
    readonly FILE_WRITE_ERROR: "FILE_WRITE_ERROR";
};
export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];
export declare class ErrorFactory {
    static validation(message: string, details?: any, suggestions?: string[]): ComposerError;
    static file(message: string, filePath?: string, suggestions?: string[]): ComposerError;
    static args(message: string, suggestions?: string[]): ComposerError;
    static generation(message: string, details?: any, suggestions?: string[]): ComposerError;
    static environment(message: string, details?: any, suggestions?: string[]): ComposerError;
    static parsing(message: string, details?: any, suggestions?: string[]): ComposerError;
}
/**
 * Centralized error handler for the application
 * @param error - The error to handle
 * @param showHelp - Optional callback to show help information
 */
export declare function handleError(error: unknown, showHelp?: () => void): never;
//# sourceMappingURL=errors.d.ts.map