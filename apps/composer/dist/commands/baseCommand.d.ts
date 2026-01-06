import { CLIOutput } from "../types";
/**
 * Abstract base class for all CLI commands.
 * Provides common functionality for command execution, validation, and file handling.
 */
export declare abstract class Command {
    protected name: string;
    /** Default directory where output files will be stored if not specified by user */
    protected defaultOutputPath: string;
    /** Default filename for output files */
    protected defaultOutputFileName: string;
    /**
     * Creates a new Command instance.
     *
     * @param name - Name of the command for logging and identification
     * @param defaultOutputPath - Optional custom default output directory
     */
    constructor(name: string, defaultOutputPath?: string);
    /**
     * Main method to run the command with the provided CLI arguments.
     * Handles validation, output path resolution, and error handling.
     *
     * @param cliOutput - The parsed command line arguments
     * @returns A promise that resolves when command execution is complete
     */
    run(cliOutput: CLIOutput): Promise<void>;
    /**
     * Abstract method that must be implemented by derived classes.
     * Contains the specific logic for each command.
     *
     * @param cliOutput - The parsed command line arguments
     * @returns A promise that resolves when execution is complete
     */
    protected abstract execute(cliOutput: CLIOutput): Promise<void>;
    /**
     * Checks if the current output path is the default one.
     *
     * @param cliOutput - The parsed command line arguments
     * @returns true if using the default output path, false otherwise
     */
    protected isUsingDefaultPath(cliOutput: CLIOutput): boolean;
    /**
     * Validates command line arguments.
     * Ensures that input files exist and validates any specified delimiter.
     *
     * @param cliOutput - The parsed command line arguments
     * @throws ComposerError if validation fails
     */
    protected validate(cliOutput: CLIOutput): Promise<void>;
    /**
     * Creates a directory if it doesn't already exist.
     *
     * @param dirPath - Path to the directory to create
     */
    protected createDirectoryIfNotExists(dirPath: string): void;
    /**
     * Checks if files in the output directory would be overwritten.
     * Prompts the user for confirmation if files would be overwritten.
     *
     * @param outputPath - Path where output files will be written
     * @returns A promise that resolves to true if execution should continue, false otherwise
     */
    protected checkForExistingFiles(outputPath: string): Promise<boolean>;
    /**
     * Logs information about a generated file.
     *
     * @param filePath - Path to the generated file
     */
    protected logGeneratedFile(filePath: string): void;
}
//# sourceMappingURL=baseCommand.d.ts.map