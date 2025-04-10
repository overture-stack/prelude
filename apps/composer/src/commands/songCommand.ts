import * as path from "path";
import * as fs from "fs";
import { Command } from "./baseCommand";
import { CLIOutput } from "../types";
import { ComposerError, ErrorCodes } from "../utils/errors";
import { SongSchema, validateSongSchema } from "../services/generateSongSchema";
import { validateFile, validateEnvironment } from "../validations";
import { Profiles } from "../types";
import { Logger } from "../utils/logger";
import { CONFIG_PATHS } from "../utils/paths";

export class SongCommand extends Command {
  constructor() {
    super("Song Schema", CONFIG_PATHS.song.dir);
  }

  private sanitizeSchemaName(name: string): string {
    const sanitized = name
      .replace(/\s+/g, "_") // Replace spaces with underscores
      .replace(/[^\w-]/g, "") // Remove non-word chars (except hyphens)
      .replace(/^[^a-zA-Z]+/, "") // Remove leading non-letters
      .replace(/^$/, "schema"); // Use 'schema' if empty after sanitization

    if (sanitized !== name) {
      Logger.warn`Schema name "${name}" will be sanitized to "${sanitized}"`;
    }

    return sanitized;
  }

  /**
   * Override isUsingDefaultPath to handle Song schema-specific defaults
   */
  protected isUsingDefaultPath(cliOutput: CLIOutput): boolean {
    return (
      cliOutput.outputPath === CONFIG_PATHS.song.schema ||
      cliOutput.outputPath ===
        path.join(CONFIG_PATHS.song.dir, "songSchema.json") ||
      super.isUsingDefaultPath(cliOutput)
    );
  }

  protected async validate(cliOutput: CLIOutput): Promise<void> {
    Logger.debug("Starting SongCommand validation");
    await super.validate(cliOutput);

    // Ensure only one JSON file is provided
    if (cliOutput.filePaths.length !== 1) {
      Logger.debug(
        `Invalid number of JSON files: ${cliOutput.filePaths.length}`
      );
      throw new ComposerError(
        "You must provide exactly one JSON file",
        ErrorCodes.INVALID_ARGS
      );
    }

    if (!cliOutput.outputPath) {
      Logger.debug("Output path validation failed");
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
    Logger.debug`Validating file extension: ${fileExtension}`;

    if (fileExtension !== ".json") {
      Logger.debug("File extension validation failed - not JSON");
      throw new ComposerError(
        "Song schema generation requires a JSON input file",
        ErrorCodes.INVALID_FILE
      );
    }

    const fileValid = await validateFile(filePath);
    if (!fileValid) {
      Logger.debug`File not found or invalid: ${filePath}`;
      throw new ComposerError(
        `Invalid file ${filePath}`,
        ErrorCodes.INVALID_FILE
      );
    }

    Logger.debug("SongCommand validation completed successfully");
  }

  protected async execute(cliOutput: CLIOutput): Promise<void> {
    Logger.debug("Starting SongCommand execution");
    const outputPath = cliOutput.outputPath!;
    const filePath = cliOutput.filePaths[0];

    try {
      Logger.info`Reading JSON input: ${path.basename(filePath)}`;
      const fileContent = fs.readFileSync(filePath, "utf-8");
      let sampleData: Record<string, any>;

      try {
        sampleData = JSON.parse(fileContent);
      } catch (error) {
        Logger.debug`JSON parsing failed: ${error}`;
        throw new ComposerError(
          "Invalid JSON file",
          ErrorCodes.INVALID_FILE,
          error
        );
      }

      // Validate JSON structure - only require experiment object
      if (!sampleData || !sampleData.experiment) {
        Logger.debug("Invalid JSON structure - missing experiment object");
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

      Logger.debug`Using schema name: ${schemaName}`;

      // Configure schema options with both fileTypes and externalValidations
      const songOptions = {
        fileTypes: cliOutput.songConfig?.fileTypes || [],
        externalValidations: [],
      };

      if (songOptions.fileTypes.length > 0) {
        Logger.debug(
          `Configured file types: ${songOptions.fileTypes.join(", ")}`
        );
      }

      // Generate and validate schema
      Logger.info("Generating schema");
      const songSchema = SongSchema(sampleData, schemaName, songOptions);

      Logger.debug("Validating generated schema");
      if (!validateSongSchema(songSchema)) {
        Logger.debug("Generated schema validation failed");
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

      Logger.success`Schema template saved to ${outputPath}`;
      Logger.warn(
        "Remember to update your schema with any specific validation requirements, including fileTypes and externalValidations options."
      );
    } catch (error) {
      Logger.debug`Error during execution: ${error}`;
      if (error instanceof ComposerError) {
        Logger.error(error.message);
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
