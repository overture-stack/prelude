import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";
import { Logger } from "../../../utils/logger";
import { ConductorError, ErrorCodes } from "../../../utils/errors";
import { LecternSchemaInfo } from "../interfaces/lectern-schema.interface";

/**
 * Service for preparing files for Lyric upload
 */
export class FilePreparationService {
  /**
   * Finds all CSV files at the given path
   * @param dataPath Directory or file path to process
   * @returns Array of CSV file paths (with full paths)
   */
  static findCSVFiles(dataPath: string): string[] {
    try {
      const stats = fs.statSync(dataPath);

      if (stats.isDirectory()) {
        // If it's a directory, find all CSV files inside
        Logger.info(`Scanning directory for CSV files: ${dataPath}`);
        const files = fs.readdirSync(dataPath);

        const csvFiles = files
          .filter((file) => file.toLowerCase().endsWith(".csv"))
          .map((file) => path.join(dataPath, file));

        if (csvFiles.length === 0) {
          Logger.warn(`No CSV files found in directory: ${dataPath}`);
        } else {
          Logger.debug(
            `Found ${csvFiles.length} CSV files in directory ${dataPath}`
          );
        }

        return csvFiles;
      } else if (path.extname(dataPath).toLowerCase() === ".csv") {
        // If it's a CSV file, return it directly
        Logger.info(`Using CSV file: ${dataPath}`);
        return [dataPath];
      } else {
        // If it's a file but not a CSV
        throw new ConductorError(
          `Path is not a CSV file or directory: ${dataPath}`,
          ErrorCodes.INVALID_ARGS,
          {
            suggestion:
              "Provide a valid CSV file or a directory containing CSV files.",
          }
        );
      }
    } catch (error) {
      if (error instanceof ConductorError) {
        throw error;
      }

      throw new ConductorError(
        `Error accessing path: ${dataPath}`,
        ErrorCodes.FILE_NOT_FOUND,
        {
          error: error instanceof Error ? error.message : String(error),
          suggestion: "Check path spelling and permissions.",
        }
      );
    }
  }

  /**
   * Prepare files for upload by renaming them to match schema names if needed
   * @param filePaths Array of original file paths
   * @param schemas Array of schema information
   * @returns Array of prepared file paths
   */
  static async prepareFilesForUpload(
    filePaths: string[],
    schemas: LecternSchemaInfo[]
  ): Promise<string[]> {
    // Valid schema names
    const schemaNames = schemas.map((schema) => schema.name);
    Logger.debug(`Valid schema names: ${schemaNames.join(", ")}`);

    // Track which files need renaming
    const exactMatches: string[] = [];
    const potentialMatches: Array<{
      originalPath: string;
      originalName: string;
      suggestedSchema: string;
    }> = [];
    const noMatches: Array<{ path: string; name: string }> = [];
    const outputPaths: string[] = [];

    // Check each file against schema names
    for (const filePath of filePaths) {
      const fileName = path.basename(filePath);
      const fileBaseName = path.basename(filePath, ".csv");

      // Exact match - schema name matches file name without extension
      if (schemaNames.includes(fileBaseName)) {
        Logger.info(`File ${fileName} matches schema name ${fileBaseName}`);
        exactMatches.push(filePath);
        outputPaths.push(filePath);
        continue;
      }

      // Find potential match by checking if any schema name is a prefix
      const matchingSchema = schemaNames.find(
        (name) => fileBaseName.startsWith(name) || name.startsWith(fileBaseName)
      );

      if (matchingSchema) {
        potentialMatches.push({
          originalPath: filePath,
          originalName: fileName,
          suggestedSchema: matchingSchema,
        });
      } else {
        noMatches.push({ path: filePath, name: fileName });
      }
    }

    // Handle potential matches - ask user if they want to rename
    if (potentialMatches.length > 0) {
      Logger.info(`\nSome files need to be renamed to match schema names:`);

      for (const match of potentialMatches) {
        const targetName = `${match.suggestedSchema}.csv`;
        const targetPath = path.join(
          path.dirname(match.originalPath),
          targetName
        );

        Logger.info(
          `Rename ${match.originalName} to ${targetName}? (matches schema '${match.suggestedSchema}')`
        );

        // Ask for confirmation
        const shouldRename = await this.confirmAction(
          `Rename ${match.originalName} to ${targetName}? [y/n]: `
        );

        if (shouldRename) {
          try {
            // Create a copy instead of renaming to preserve the original
            fs.copyFileSync(match.originalPath, targetPath);

            fs.copyFileSync(match.originalPath, targetPath);
            Logger.success(`Created ${targetName} from ${match.originalName}`);
            outputPaths.push(targetPath);
          } catch (error) {
            Logger.error(
              `Failed to create ${targetName}: ${
                error instanceof Error ? error.message : String(error)
              }`
            );
          }
        } else {
          Logger.warn(`Skipping ${match.originalName}`);
        }
      }
    }

    // Report files that don't match any schema
    if (noMatches.length > 0) {
      Logger.warn(
        `\nThe following files don't match any schema name and will be skipped:`
      );
      noMatches.forEach((file) => {
        Logger.warn(`- ${file.name}`);
      });

      Logger.info(`\nValid schema names are: ${schemaNames.join(", ")}`);
      Logger.tip(
        `Rename your files to match one of these schema names (e.g., "${schemaNames[0]}.csv")`
      );
    }

    return outputPaths;
  }

  /**
   * Ask for user confirmation
   * @param question Question to ask
   * @returns True if user confirms, false otherwise
   */
  private static async confirmAction(question: string): Promise<boolean> {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    return new Promise<boolean>((resolve) => {
      rl.question(question, (answer) => {
        rl.close();
        resolve(answer.toLowerCase() === "y" || answer.toLowerCase() === "yes");
      });
    });
  }

  /**
   * Resolves the data directory/file path with fallback and validation
   * @param cliOutput The CLI configuration and inputs
   * @returns A resolved, absolute path to the data directory or file
   */
  static resolveDataPath(cliOutput: any): string {
    // First check command-line options.dataDirectory which is set by -d flag
    const fromCommandLine = cliOutput.options?.dataDirectory;

    // Then check the config object and environment
    const fromConfig = cliOutput.config.lyric?.dataDirectory;
    const fromEnv = process.env.LYRIC_DATA;

    // Use the first available source, with fallback to "./data"
    const rawDataPath = fromCommandLine || fromConfig || fromEnv || "./data";

    // Log where we found the path
    if (fromCommandLine) {
      Logger.debug(`Using data path from command line: ${fromCommandLine}`);
    } else if (fromConfig) {
      Logger.debug(`Using data path from config: ${fromConfig}`);
    } else if (fromEnv) {
      Logger.debug(`Using data path from environment: ${fromEnv}`);
    } else {
      Logger.debug(`Using default data path: ./data`);
    }

    // Resolve to an absolute path
    const resolvedPath = path.resolve(process.cwd(), rawDataPath);
    Logger.debug(`Resolved data path: ${resolvedPath}`);

    // Validate the path exists
    if (!fs.existsSync(resolvedPath)) {
      throw new ConductorError(
        `Path not found: ${resolvedPath}`,
        ErrorCodes.FILE_NOT_FOUND,
        {
          providedPath: rawDataPath,
          resolvedPath,
          suggestion: "Make sure the path exists and is accessible.",
        }
      );
    }

    return resolvedPath;
  }
}
