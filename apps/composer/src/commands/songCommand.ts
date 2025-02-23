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
import { Logger } from "../utils/logger";

export class SongCommand extends Command {
  constructor() {
    super("Song Schema");
  }

  private sanitizeSchemaName(name: string): string {
    const sanitized = name
      .replace(/\s+/g, "_") // Replace spaces with underscores
      .replace(/[^\w-]/g, "") // Remove non-word chars (except hyphens)
      .replace(/^[^a-zA-Z]+/, "") // Remove leading non-letters
      .replace(/^$/, "schema"); // Use 'schema' if empty after sanitization

    if (sanitized !== name) {
      Logger.warn(`Schema name "${name}" will be sanitized to "${sanitized}"`);
    }

    return sanitized;
  }

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
      this.sanitizeSchemaName(cliOutput.songConfig.name);
    }

    // Validate file type and accessibility
    const filePath = cliOutput.filePaths[0];
    const fileExtension = path.extname(filePath).toLowerCase();

    if (fileExtension !== ".json") {
      throw new ComposerError(
        "Song schema generation requires a JSON input file",
        ErrorCodes.INVALID_FILE
      );
    }

    const fileValid = await validateFile(filePath);
    if (!fileValid) {
      throw new ComposerError(
        `Invalid file ${filePath}`,
        ErrorCodes.INVALID_FILE
      );
    }
  }

  protected async execute(cliOutput: CLIOutput): Promise<void> {
    const outputPath = cliOutput.outputPath!;
    const filePath = cliOutput.filePaths[0];

    Logger.header("Generating SONG Schema");

    try {
      Logger.info("Reading JSON input file");
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

      Logger.debug(`Using schema name: ${schemaName}`);

      // Configure schema options
      const songOptions = cliOutput.songConfig?.fileTypes
        ? { fileTypes: cliOutput.songConfig.fileTypes }
        : undefined;

      if (songOptions?.fileTypes) {
        Logger.debug(
          `Configured file types: ${songOptions.fileTypes.join(", ")}`
        );
      }

      // Generate and validate schema
      Logger.info("Generating schema");
      const songSchema = generateSongSchema(
        sampleData,
        schemaName,
        songOptions
      );

      Logger.info("Validating generated schema");
      if (!validateSongSchema(songSchema)) {
        throw new ComposerError(
          "Generated schema validation failed",
          ErrorCodes.VALIDATION_FAILED
        );
      }

      // Ensure output directory exists
      await validateEnvironment({
        profile: Profiles.GENERATE_SONG_SCHEMA,
        outputPath: outputPath,
      });

      // Write schema to file
      fs.writeFileSync(outputPath, JSON.stringify(songSchema, null, 2));

      Logger.success(`Schema saved to ${outputPath}`);
      Logger.warn(
        "Note: enums and required fields are not inferred, make sure to update your schema accordingly"
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
