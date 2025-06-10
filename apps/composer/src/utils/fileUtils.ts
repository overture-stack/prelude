import * as fs from "fs";
import * as path from "path";
import { Logger } from "./logger";
import { ComposerError, ErrorCodes } from "./errors";

/**
 * Expands directory paths to individual file paths, filtering by extension if specified
 * @param paths Array of file or directory paths
 * @param extensions Optional array of extensions to filter by (e.g., ['.csv', '.json'])
 * @returns Array of expanded file paths
 */
export function expandDirectoryPaths(
  paths: string[],
  extensions?: string[]
): string[] {
  if (!paths || paths.length === 0) {
    return [];
  }

  let expandedPaths: string[] = [];

  paths.forEach((inputPath) => {
    try {
      const stats = fs.statSync(inputPath);

      if (stats.isDirectory()) {
        Logger.debug(`Processing directory: ${inputPath}`);

        // Read all files in the directory
        const filesInDir = fs
          .readdirSync(inputPath)
          .map((file) => path.join(inputPath, file))
          .filter((file) => {
            try {
              const fileStat = fs.statSync(file);

              // Skip if not a file
              if (!fileStat.isFile()) {
                return false;
              }

              // Filter by extension if specified
              if (extensions && extensions.length > 0) {
                const ext = path.extname(file).toLowerCase();
                return extensions.includes(ext);
              }

              return true;
            } catch (error) {
              Logger.debug(`Error accessing file ${file}: ${error}`);
              return false;
            }
          });

        if (filesInDir.length === 0) {
          if (extensions && extensions.length > 0) {
            Logger.warn(
              `No files with extensions ${extensions.join(
                ", "
              )} found in directory: ${inputPath}`
            );
          } else {
            Logger.warn(`Directory is empty: ${inputPath}`);
          }
        } else {
          Logger.debug(
            `Found ${filesInDir.length} files in directory ${inputPath}`
          );
          expandedPaths = [...expandedPaths, ...filesInDir];
        }
      } else {
        // It's a file, check extension if needed
        if (extensions && extensions.length > 0) {
          const ext = path.extname(inputPath).toLowerCase();
          if (extensions.includes(ext)) {
            expandedPaths.push(inputPath);
          } else {
            Logger.debug(
              `Skipping file with unsupported extension: ${inputPath}`
            );
          }
        } else {
          expandedPaths.push(inputPath);
        }
      }
    } catch (error) {
      Logger.debug(`Error accessing path ${inputPath}: ${error}`);
      throw new ComposerError(
        `Cannot access path: ${inputPath}`,
        ErrorCodes.FILE_NOT_FOUND,
        error
      );
    }
  });

  return expandedPaths;
}
