import * as path from "path";
import * as fs from "fs";
import { Command } from "./baseCommand";
import { CLIOutput } from "../types";
import { ComposerError, ErrorCodes, ErrorFactory } from "../utils/errors";
import {
  generateDictionary,
  generateSchema,
} from "../services/generateLecternDictionary";
import { parseCSVLine } from "../utils/csvParser";
import { validateCSVHeaders } from "../validations";
import { Logger } from "../utils/logger";
import { CONFIG_PATHS } from "../utils/paths";

export class DictionaryCommand extends Command {
  // Define dictionary-specific defaults
  protected readonly defaultOutputFileName = "dictionary.json";

  constructor() {
    super("Lectern Dictionary", CONFIG_PATHS.lectern.dir);
  }

  /**
   * Override isUsingDefaultPath to handle dictionary-specific defaults
   */
  protected isUsingDefaultPath(cliOutput: CLIOutput): boolean {
    return (
      cliOutput.outputPath === CONFIG_PATHS?.lectern?.dictionary ||
      cliOutput.outputPath ===
        path.join(CONFIG_PATHS?.lectern?.dir || "", "dictionary.json") ||
      super.isUsingDefaultPath(cliOutput)
    );
  }

  protected async validate(cliOutput: CLIOutput): Promise<void> {
    await super.validate(cliOutput);

    if (!cliOutput.outputPath) {
      throw ErrorFactory.args("Output path is required", [
        "Use -o or --output to specify an output path",
        "Example: -o /path/to/dictionary.json",
      ]);
    }

    // Get only CSV files from the paths (already expanded in base class)
    const csvFiles = cliOutput.filePaths.filter(
      (filePath) => path.extname(filePath).toLowerCase() === ".csv"
    );

    // Check if we've got valid CSV files
    if (csvFiles.length === 0) {
      throw ErrorFactory.file(
        "Lectern dictionary generation requires CSV input files",
        undefined,
        [
          "Ensure your input files have .csv extension",
          "Check that the files exist and are accessible",
          "Example: -f data.csv metadata.csv",
        ]
      );
    }

   
    if (csvFiles.length < cliOutput.filePaths.length) {
      const skippedFiles = cliOutput.filePaths.filter(
        (filePath) => path.extname(filePath).toLowerCase() !== ".csv"
      );

      // If files were explicitly provided (not from directory expansion),
      // this should be an error rather than a warning
      const nonCsvExtensions = skippedFiles.map((file) =>
        path.extname(file).toLowerCase()
      );

      throw ErrorFactory.validation(
        "Lectern dictionary generation only supports CSV files",
        {
          csvFiles,
          skippedFiles,
          unsupportedExtensions: nonCsvExtensions,
          totalProvided: cliOutput.filePaths.length,
          csvCount: csvFiles.length,
        },
        [
          "Use only CSV files for Lectern dictionary generation",
          `Found unsupported file types: ${nonCsvExtensions.join(", ")}`,
          "Remove non-CSV files from your file list",
          "Example: -f data.csv metadata.csv (not -f data.csv schema.json)",
          "Use different profiles for different file types:",
        ].concat(
          skippedFiles.map(
            (file) =>
              `  • For ${file}: use ElasticsearchMapping or SongSchema profile`
          )
        )
      );
    }

    Logger.info`Processing ${csvFiles.length} CSV files`;

    // Validate CSV headers for each file - use csvDelimiter directly
    const validFiles: string[] = [];
    const invalidFiles: string[] = [];
    const allInvalidHeaders: string[] = [];

    for (const filePath of cliOutput.filePaths) {
      try {
        const csvHeadersValid = await validateCSVHeaders(
          filePath,
          cliOutput.csvDelimiter
        );
        if (csvHeadersValid) {
          validFiles.push(filePath);
        } else {
          invalidFiles.push(filePath);
        }
      } catch (error) {
        if (error instanceof ComposerError && (error.details as any)?.invalidHeaders) {
          allInvalidHeaders.push(...(error.details as any).invalidHeaders);
        }
        invalidFiles.push(filePath);
      }
    }

    // Show consolidated validation results
    if (invalidFiles.length > 0) {
      if (allInvalidHeaders.length > 0) {
        // Show unique invalid headers as a warning, not an error
        const uniqueInvalidHeaders = [...new Set(allInvalidHeaders)];
        Logger.warnString("The following header(s) are invalid:");
        uniqueInvalidHeaders.forEach((header) => {
          Logger.generic(`  - ${header}`);
        });
      }

      Logger.warn`Skipping ${invalidFiles.length} files with invalid headers`;
      invalidFiles.forEach((file) => {
        Logger.generic(`  - ${path.basename(file)}`);
      });

      // Update filePaths to only include valid files
      cliOutput.filePaths = validFiles;
    }

    // Ensure we still have files to process
    if (cliOutput.filePaths.length === 0) {
      throw ErrorFactory.validation(
        "No valid CSV files found with proper headers",
        { invalidFiles },
        [
          "Check that CSV files have valid column headers",
          "Headers should not contain special characters or be empty",
        ]
      );
    }

    Logger.info`Found ${cliOutput.filePaths.length} valid CSV files to process`;
  }

  protected async execute(cliOutput: CLIOutput): Promise<void> {
    const { dictionaryConfig } = cliOutput;
    const delimiter = cliOutput.csvDelimiter;

    const outputPath = this.resolveOutputPath(cliOutput.outputPath!, ".json");

    try {

      const dictionary = generateDictionary(
        dictionaryConfig!.name,
        dictionaryConfig!.description,
        dictionaryConfig!.version
      );

      let processedFiles = 0;
      let skippedFiles = 0;

      for (const filePath of cliOutput.filePaths) {
        try {
          const fileContent = fs.readFileSync(filePath, "utf-8");
          const [headerLine, sampleLine] = fileContent.split("\n");

          if (!headerLine) {
            Logger.warn`CSV file ${path.basename(
              filePath
            )} is empty or has no headers. Skipping.`;
            skippedFiles++;
            continue;
          }

          const headers = parseCSVLine(headerLine, delimiter, true)[0];
          if (!headers) {
            Logger.warn`Failed to parse CSV headers in ${path.basename(
              filePath
            )}. Skipping.`;
            skippedFiles++;
            continue;
          }

          // Process sample data
          const sampleData: Record<string, string> = {};
          if (sampleLine) {
            const sampleValues = parseCSVLine(sampleLine, delimiter, false)[0];
            if (sampleValues) {
              headers.forEach((header: string, index: number) => {
                sampleData[header] = sampleValues[index] || "";
              });
            }
          }

          // Pass the full file path to generateSchema to extract the schema name
          const schema = generateSchema(filePath, headers, sampleData);
          dictionary.schemas.push(schema);
          Logger.debug`Generated schema for ${schema.name}`;
          processedFiles++;
        } catch (error) {
          Logger.warn`Skipping ${path.basename(
            filePath
          )} due to error: ${error}`;
          skippedFiles++;
          continue;
        }
      }

      // Log summary of processing
      Logger.info`Successfully processed ${processedFiles} CSV files`;
      if (skippedFiles > 0) {
        Logger.warn`Skipped ${skippedFiles} files due to errors`;
      }

      // Ensure output directory exists
      const outputDir = path.dirname(outputPath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
        Logger.debug`Created output directory: ${outputDir}`;
      }

      // Write dictionary to file
      fs.writeFileSync(outputPath, JSON.stringify(dictionary, null, 2));
      Logger.success`Dictionary saved to ${outputPath}`;

      Logger.debug`Dictionary generation complete`;
    } catch (error) {
      if (error instanceof ComposerError) {
        throw error;
      }
      throw ErrorFactory.generation(
        "Error generating Lectern dictionary",
        error,
        [
          "Check that all CSV files are properly formatted",
          "Ensure output directory is writable",
          "Verify file permissions and disk space",
        ]
      );
    }
  }
}
