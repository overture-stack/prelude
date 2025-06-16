/**
 * Enhanced File Utilities
 *
 * Centralized file and directory operations with consistent error handling.
 * Eliminates code duplication while maintaining command-specific flexibility.
 */

import * as fs from "fs";
import * as path from "path";
import { ErrorFactory } from "./errors";
import { Logger } from "./logger";

/**
 * Core file validation with consistent error handling
 */
export function validateFileAccess(
  filePath: string,
  fileType: string = "file"
): void {
  const fileName = path.basename(filePath);

  if (!filePath || typeof filePath !== "string" || filePath.trim() === "") {
    throw ErrorFactory.args(`${fileType} path not specified`, undefined, [
      `Provide a ${fileType} path`,
      "Check command line arguments",
      `Example: --${fileType
        .toLowerCase()
        .replace(/\s+/g, "-")}-file example.json`,
    ]);
  }

  if (!fs.existsSync(filePath)) {
    throw ErrorFactory.file(`${fileType} not found: ${fileName}`, filePath, [
      "Check that the file path is correct",
      "Ensure the file exists at the specified location",
      "Verify file permissions allow read access",
      `Current directory: ${process.cwd()}`,
      "Use absolute path if relative path is not working",
    ]);
  }

  // Check if file is readable
  try {
    fs.accessSync(filePath, fs.constants.R_OK);
  } catch (error) {
    throw ErrorFactory.file(
      `${fileType} is not readable: ${fileName}`,
      filePath,
      [
        "Check file permissions",
        "Ensure the file is not locked by another process",
        "Verify you have read access to the file",
        "Try copying the file to a different location",
      ]
    );
  }

  // Check file size
  const stats = fs.statSync(filePath);
  if (stats.size === 0) {
    throw ErrorFactory.file(`${fileType} is empty: ${fileName}`, filePath, [
      `Ensure the ${fileType.toLowerCase()} contains data`,
      "Check if the file was properly created",
      "Verify the file is not corrupted",
      "Try recreating the file with valid content",
    ]);
  }

  Logger.debug`${fileType} validated: ${fileName}`;
}

/**
 * Core directory validation with consistent error handling
 */
export function validateDirectoryAccess(
  dirPath: string,
  dirType: string = "directory"
): void {
  const dirName = path.basename(dirPath);

  if (!dirPath || typeof dirPath !== "string" || dirPath.trim() === "") {
    throw ErrorFactory.args(`${dirType} path not specified`, undefined, [
      `Provide a ${dirType} path`,
      "Check command line arguments",
      `Example: --${dirType.toLowerCase().replace(/\s+/g, "-")} ./data`,
    ]);
  }

  if (!fs.existsSync(dirPath)) {
    throw ErrorFactory.file(`${dirType} not found: ${dirName}`, dirPath, [
      "Check that the directory path is correct",
      "Ensure the directory exists",
      "Verify permissions allow access",
      `Current directory: ${process.cwd()}`,
      "Use absolute path if relative path is not working",
    ]);
  }

  const stats = fs.statSync(dirPath);
  if (!stats.isDirectory()) {
    throw ErrorFactory.file(`Path is not a directory: ${dirName}`, dirPath, [
      "Provide a directory path, not a file path",
      "Check the path points to a directory",
      "Ensure the path is correct",
    ]);
  }

  Logger.debug`${dirType} validated: ${dirName}`;
}

/**
 * Find files by extension with filtering options
 */
export function findFilesByExtension(
  dirPath: string,
  extensions: string[],
  options: {
    recursive?: boolean;
    minSize?: number;
    maxSize?: number;
  } = {}
): string[] {
  const { recursive = false, minSize = 1, maxSize } = options;
  const normalizedExts = extensions.map((ext) =>
    ext.toLowerCase().startsWith(".")
      ? ext.toLowerCase()
      : `.${ext.toLowerCase()}`
  );

  let foundFiles: string[] = [];

  function scanDirectory(currentDir: string): void {
    try {
      const entries = fs.readdirSync(currentDir);

      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry);

        try {
          const stats = fs.statSync(fullPath);

          if (stats.isDirectory() && recursive) {
            scanDirectory(fullPath);
          } else if (stats.isFile()) {
            const ext = path.extname(entry).toLowerCase();

            if (normalizedExts.includes(ext)) {
              // Check size constraints
              if (
                stats.size >= minSize &&
                (!maxSize || stats.size <= maxSize)
              ) {
                foundFiles.push(fullPath);
              }
            }
          }
        } catch (error) {
          // Skip files we can't access
          Logger.debug`Skipping inaccessible file: ${fullPath}`;
        }
      }
    } catch (error) {
      throw ErrorFactory.file(
        `Cannot read directory: ${path.basename(currentDir)}`,
        currentDir,
        [
          "Check directory permissions",
          "Ensure directory is accessible",
          "Verify directory is not corrupted",
        ]
      );
    }
  }

  scanDirectory(dirPath);
  return foundFiles;
}

/**
 * Fluent API for file validation
 */
export class FileValidator {
  private filePath: string;
  private fileType: string;
  private requiredExtensions?: string[];
  private minSizeBytes?: number;
  private maxSizeBytes?: number;
  private shouldExist: boolean = true;

  constructor(filePath: string, fileType: string = "file") {
    this.filePath = filePath;
    this.fileType = fileType;
  }

  /**
   * Require specific file extensions
   */
  requireExtension(extensions: string | string[]): this {
    this.requiredExtensions = Array.isArray(extensions)
      ? extensions
      : [extensions];
    return this;
  }

  /**
   * Require minimum file size
   */
  requireMinSize(bytes: number): this {
    this.minSizeBytes = bytes;
    return this;
  }

  /**
   * Require maximum file size
   */
  requireMaxSize(bytes: number): this {
    this.maxSizeBytes = bytes;
    return this;
  }

  /**
   * Allow file to not exist (for optional files)
   */
  optional(): this {
    this.shouldExist = false;
    return this;
  }

  /**
   * Execute validation
   */
  validate(): boolean {
    // If file is optional and doesn't exist, that's fine
    if (!this.shouldExist && !fs.existsSync(this.filePath)) {
      return false;
    }

    // Standard file access validation
    validateFileAccess(this.filePath, this.fileType);

    const stats = fs.statSync(this.filePath);
    const fileName = path.basename(this.filePath);

    // Extension validation
    if (this.requiredExtensions) {
      const fileExt = path.extname(this.filePath).toLowerCase();
      const normalizedExts = this.requiredExtensions.map((ext) =>
        ext.startsWith(".") ? ext.toLowerCase() : `.${ext.toLowerCase()}`
      );

      if (!normalizedExts.includes(fileExt)) {
        throw ErrorFactory.validation(
          `Invalid ${this.fileType} extension: ${fileName}`,
          {
            actualExtension: fileExt,
            allowedExtensions: normalizedExts,
            filePath: this.filePath,
          },
          [
            `${
              this.fileType
            } must have one of these extensions: ${normalizedExts.join(", ")}`,
            `Found extension: ${fileExt}`,
            "Check the file format and rename if necessary",
          ]
        );
      }
    }

    // Size validation
    if (this.minSizeBytes !== undefined && stats.size < this.minSizeBytes) {
      throw ErrorFactory.file(
        `${this.fileType} is too small: ${fileName} (${stats.size} bytes)`,
        this.filePath,
        [
          `Minimum size required: ${this.minSizeBytes} bytes`,
          `Current size: ${stats.size} bytes`,
          "Ensure the file contains sufficient data",
        ]
      );
    }

    if (this.maxSizeBytes !== undefined && stats.size > this.maxSizeBytes) {
      throw ErrorFactory.file(
        `${this.fileType} is too large: ${fileName} (${stats.size} bytes)`,
        this.filePath,
        [
          `Maximum size allowed: ${this.maxSizeBytes} bytes`,
          `Current size: ${stats.size} bytes`,
          "Consider compressing or splitting the file",
        ]
      );
    }

    return true;
  }
}

/**
 * Fluent API for directory validation
 */
export class DirectoryValidator {
  private dirPath: string;
  private dirType: string;
  private requiredFiles?: string[];
  private requiredExtensions?: string[];
  private minFileCount?: number;
  private maxFileCount?: number;

  constructor(dirPath: string, dirType: string = "directory") {
    this.dirPath = dirPath;
    this.dirType = dirType;
  }

  /**
   * Require specific files to exist in directory
   */
  requireFiles(fileNames: string[]): this {
    this.requiredFiles = fileNames;
    return this;
  }

  /**
   * Require files with specific extensions
   */
  requireFilesWithExtensions(extensions: string[]): this {
    this.requiredExtensions = extensions;
    return this;
  }

  /**
   * Require minimum number of files
   */
  requireMinFileCount(count: number): this {
    this.minFileCount = count;
    return this;
  }

  /**
   * Require maximum number of files
   */
  requireMaxFileCount(count: number): this {
    this.maxFileCount = count;
    return this;
  }

  /**
   * Execute validation
   */
  validate(): string[] {
    // Standard directory access validation
    validateDirectoryAccess(this.dirPath, this.dirType);

    const allFiles = fs
      .readdirSync(this.dirPath)
      .map((file) => path.join(this.dirPath, file))
      .filter((filePath) => {
        try {
          return fs.statSync(filePath).isFile();
        } catch {
          return false;
        }
      });

    // Required files validation
    if (this.requiredFiles) {
      const missingFiles = this.requiredFiles.filter((fileName) => {
        const fullPath = path.join(this.dirPath, fileName);
        return !fs.existsSync(fullPath);
      });

      if (missingFiles.length > 0) {
        throw ErrorFactory.file(
          `Required files missing in ${this.dirType}: ${path.basename(
            this.dirPath
          )}`,
          this.dirPath,
          [
            `Missing files: ${missingFiles.join(", ")}`,
            "Ensure all required files are present",
            "Check file names and spelling",
          ]
        );
      }
    }

    // Extension filtering and validation
    let relevantFiles = allFiles;
    if (this.requiredExtensions) {
      const normalizedExts = this.requiredExtensions.map((ext) =>
        ext.startsWith(".") ? ext.toLowerCase() : `.${ext.toLowerCase()}`
      );

      relevantFiles = allFiles.filter((filePath) => {
        const ext = path.extname(filePath).toLowerCase();
        return normalizedExts.includes(ext);
      });

      if (relevantFiles.length === 0) {
        throw ErrorFactory.file(
          `No files with required extensions found in ${
            this.dirType
          }: ${path.basename(this.dirPath)}`,
          this.dirPath,
          [
            `Required extensions: ${normalizedExts.join(", ")}`,
            `Directory contains: ${
              allFiles.map((f) => path.extname(f)).join(", ") || "no files"
            }`,
            "Check file extensions and directory contents",
          ]
        );
      }
    }

    // File count validation
    if (
      this.minFileCount !== undefined &&
      relevantFiles.length < this.minFileCount
    ) {
      throw ErrorFactory.file(
        `Insufficient files in ${this.dirType}: ${path.basename(this.dirPath)}`,
        this.dirPath,
        [
          `Minimum files required: ${this.minFileCount}`,
          `Files found: ${relevantFiles.length}`,
          "Add more files to the directory",
        ]
      );
    }

    if (
      this.maxFileCount !== undefined &&
      relevantFiles.length > this.maxFileCount
    ) {
      throw ErrorFactory.file(
        `Too many files in ${this.dirType}: ${path.basename(this.dirPath)}`,
        this.dirPath,
        [
          `Maximum files allowed: ${this.maxFileCount}`,
          `Files found: ${relevantFiles.length}`,
          "Remove some files or use a different directory",
        ]
      );
    }

    Logger.debug`${this.dirType} validation passed: ${relevantFiles.length} files found`;
    return relevantFiles;
  }
}

/**
 * Validation builder for fluent API
 */
export class ValidationBuilder {
  /**
   * Start file validation
   */
  static file(filePath: string, fileType?: string): FileValidator {
    return new FileValidator(filePath, fileType);
  }

  /**
   * Start directory validation
   */
  static directory(dirPath: string, dirType?: string): DirectoryValidator {
    return new DirectoryValidator(dirPath, dirType);
  }
}
