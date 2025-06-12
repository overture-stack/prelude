import * as path from "path";
import * as fs from "fs";
import { Command } from "./baseCommand";
import { CLIOutput } from "../types";
import { ErrorFactory } from "../utils/errors"; // UPDATED: Import ErrorFactory
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
    Logger.debug`Starting SongCommand validation`;
    await super.validate(cliOutput);

    // Ensure only one JSON file is provided
    if (cliOutput.filePaths.length !== 1) {
      Logger.debug`Invalid number of JSON files: ${cliOutput.filePaths.length}`;
      // UPDATED: Use ErrorFactory with helpful suggestions
      throw ErrorFactory.args("You must provide exactly one JSON file", [
        "Song schema generation requires a single JSON input file",
        "Example: -f sample-data.json",
        "Multiple files are not supported for Song schema generation",
      ]);
    }

    if (!cliOutput.outputPath) {
      Logger.debug`Output path validation failed`;
      // UPDATED: Use ErrorFactory with helpful suggestions
      throw ErrorFactory.args("Output path is required", [
        "Use -o or --output to specify where to save the schema",
        "Example: -o song-schema.json",
        "The output will be a JSON schema file",
      ]);
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
      Logger.debug`File extension validation failed - not JSON`;
      // UPDATED: Use ErrorFactory with helpful suggestions
      throw ErrorFactory.file(
        "Song schema generation requires a JSON input file",
        filePath,
        [
          "Ensure the input file has a .json extension",
          "The file should contain sample metadata in JSON format",
          "Example: sample-metadata.json",
        ]
      );
    }

    const fileValid = await validateFile(filePath);
    if (!fileValid) {
      Logger.debug`File not found or invalid: ${filePath}`;
      // UPDATED: Use ErrorFactory with helpful suggestions
      throw ErrorFactory.file(`Invalid file ${filePath}`, filePath, [
        "Check that the file exists and is readable",
        "Ensure the JSON file is properly formatted",
        "Verify file permissions allow reading",
      ]);
    }

    Logger.debug`SongCommand validation completed successfully`;
  }

  protected async execute(cliOutput: CLIOutput): Promise<void> {
    Logger.debug`Starting SongCommand execution`;
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
        // UPDATED: Use ErrorFactory with helpful suggestions
        throw ErrorFactory.file("Invalid JSON file", filePath, [
          "Ensure the file contains valid JSON syntax",
          "Check for missing quotes, commas, or brackets",
          "Use a JSON validator to verify the format",
        ]);
      }

      // Validate JSON structure - only require experiment object
      if (!sampleData || !sampleData.experiment) {
        Logger.debug`Invalid JSON structure - missing experiment object`;
        // UPDATED: Use ErrorFactory with helpful suggestions
        throw ErrorFactory.validation(
          "JSON must contain an experiment object",
          { providedKeys: Object.keys(sampleData || {}) },
          [
            "Ensure the JSON has an 'experiment' property",
            "The experiment object should contain sample metadata",
          ]
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
        Logger.debug`Configured file types: ${songOptions.fileTypes.join(
          ", "
        )}`;
      }

      // Generate and validate schema
      Logger.info`Generating schema`;
      const songSchema = SongSchema(sampleData, schemaName, songOptions);

      Logger.debug`Validating generated schema`;
      if (!validateSongSchema(songSchema)) {
        Logger.debug`Generated schema validation failed`;
        // UPDATED: Use ErrorFactory with helpful suggestions
        throw ErrorFactory.validation(
          "Generated schema validation failed",
          { schemaName },
          [
            "Check that the input JSON contains valid experiment data",
            "Ensure all required fields are present",
            "Verify the schema structure meets SONG requirements",
          ]
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
      Logger.warnString(
        "Remember to update your schema with any specific validation requirements, including fileTypes and externalValidations options."
      );
    } catch (error) {
      Logger.debug`Error during execution: ${error}`;
      if (error instanceof Error && error.name === "ComposerError") {
        throw error;
      }
      // UPDATED: Use ErrorFactory
      throw ErrorFactory.generation("Error generating SONG schema", error, [
        "Check that the input JSON file is valid",
        "Ensure the output directory is writable",
        "Verify the JSON contains required experiment data",
        "Check file permissions and disk space",
      ]);
    }
  }
}
