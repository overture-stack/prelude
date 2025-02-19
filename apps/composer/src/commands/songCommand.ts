import * as path from "path";
import * as fs from "fs";
import { Command } from "./baseCommand";
import { CLIOutput } from "../types";
import { ComposerError, ErrorCodes } from "../utils/errors";
import {
  generateSongSchema,
  validateSongSchema,
} from "../services/generateSongSchema";
import { validateFile, validateEnvironment } from "../validations";
import { Profiles } from "../types";
import chalk from "chalk";

/**
 * Command for generating SONG schemas from JSON sample data.
 * Handles schema name sanitization, file validation, and schema generation
 * with appropriate error handling throughout the process.
 */
export class SongCommand extends Command {
  constructor() {
    super("Song Schema");
  }

  /**
   * Sanitizes a schema name by:
   * - Replacing spaces with underscores
   * - Removing special characters
   * - Ensuring it starts with a letter
   * - Providing a default if empty
   *
   * @param name - Raw schema name to sanitize
   * @returns Sanitized schema name suitable for use
   *
   * @example
   * sanitizeSchemaName("My Schema!") // Returns "My_Schema"
   * sanitizeSchemaName("123schema") // Returns "schema"
   * sanitizeSchemaName("") // Returns "schema"
   */
  private sanitizeSchemaName(name: string): string {
    return name
      .replace(/\s+/g, "_") // Replace spaces with underscores
      .replace(/[^\w-]/g, "") // Remove non-word chars (except hyphens)
      .replace(/^[^a-zA-Z]+/, "") // Remove leading non-letters
      .replace(/^$/, "schema"); // Use 'schema' if empty after sanitization
  }

  /**
   * Validates command inputs and file types.
   * Checks for:
   * - Required output path
   * - Valid schema name
   * - JSON file type
   * - File accessibility
   */
  protected async validate(cliOutput: CLIOutput): Promise<void> {
    await super.validate(cliOutput);

    if (!cliOutput.outputPath) {
      throw new ComposerError(
        "Output path is required",
        ErrorCodes.INVALID_ARGS
      );
    }

    // Validate and sanitize schema name if provided
    if (cliOutput.songConfig?.name) {
      const originalName = cliOutput.songConfig.name;
      const sanitizedName = this.sanitizeSchemaName(originalName);

      if (sanitizedName !== originalName) {
        console.log(
          chalk.yellow(
            `Note: Schema name "${originalName}" will be sanitized to "${sanitizedName}"`
          )
        );
      }
    }

    // Validate file type
    const filePath = cliOutput.filePaths[0];
    const fileExtension = path.extname(filePath).toLowerCase();

    if (fileExtension !== ".json") {
      throw new ComposerError(
        "Song schema generation requires a JSON input file",
        ErrorCodes.INVALID_FILE
      );
    }

    // Validate file accessibility
    const fileValid = await validateFile(filePath);
    if (!fileValid) {
      throw new ComposerError(
        `Invalid file ${filePath}`,
        ErrorCodes.INVALID_FILE
      );
    }
  }

  /**
   * Executes the schema generation process:
   * 1. Reads and validates input JSON
   * 2. Generates schema with sanitized name
   * 3. Validates generated schema
   * 4. Saves to specified output path
   */
  protected async execute(cliOutput: CLIOutput): Promise<void> {
    const outputPath = cliOutput.outputPath!;
    const filePath = cliOutput.filePaths[0];

    console.log(chalk.cyan("\nGenerating SONG schema..."));

    try {
      // Read and validate JSON input
      const fileContent = fs.readFileSync(filePath, "utf-8");
      let sampleData: Record<string, any>;

      try {
        sampleData = JSON.parse(fileContent);
      } catch (error) {
        throw new ComposerError(
          "Invalid JSON file",
          ErrorCodes.INVALID_FILE,
          error
        );
      }

      // Validate JSON structure
      if (!sampleData || !sampleData.experiment) {
        throw new ComposerError(
          "JSON must contain an experiment object",
          ErrorCodes.VALIDATION_FAILED
        );
      }

      // Determine schema name
      const schemaName = cliOutput.songConfig?.name
        ? this.sanitizeSchemaName(cliOutput.songConfig.name)
        : this.sanitizeSchemaName(
            path.basename(filePath, path.extname(filePath))
          );

      // Configure schema options
      const songOptions = cliOutput.songConfig?.fileTypes
        ? { fileTypes: cliOutput.songConfig.fileTypes }
        : undefined;

      // Generate and validate schema
      const songSchema = generateSongSchema(
        sampleData,
        schemaName,
        songOptions
      );

      if (!validateSongSchema(songSchema)) {
        throw new ComposerError(
          "Generated schema validation failed",
          ErrorCodes.VALIDATION_FAILED
        );
      }

      // Ensure output directory exists using validation utility
      await validateEnvironment({
        profile: Profiles.GENERATE_SONG_SCHEMA,
        outputPath: outputPath,
      });

      // Write schema to file
      fs.writeFileSync(outputPath, JSON.stringify(songSchema, null, 2));

      console.log(chalk.green(`✓ Song schema saved to ${outputPath}`));
      console.log(
        chalk.white(
          "Tip: enums and required fields are not inferred, make sure to update your schema accordingly"
        )
      );
    } catch (error) {
      if (error instanceof ComposerError) {
        throw error;
      }
      throw new ComposerError(
        "Error generating SONG schema",
        ErrorCodes.GENERATION_FAILED,
        error
      );
    }
  }
}
