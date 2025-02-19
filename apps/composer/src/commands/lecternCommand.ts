import * as path from "path";
import * as fs from "fs";
import { Command } from "./baseCommand";
import { CLIOutput } from "../types";
import { ComposerError, ErrorCodes } from "../utils/errors";
import {
  generateDictionary,
  generateSchema,
} from "../services/generateLecternDictionary";
import { parseCSVLine } from "../utils/csvParser";
import { validateCSVHeaders, validateEnvironment } from "../validations";
import { Profiles } from "../types";
import chalk from "chalk";

export class DictionaryCommand extends Command {
  constructor() {
    super("Lectern Dictionary");
  }

  protected async validate(cliOutput: CLIOutput): Promise<void> {
    await super.validate(cliOutput);

    if (!cliOutput.outputPath) {
      throw new ComposerError(
        "Output path is required",
        ErrorCodes.INVALID_ARGS
      );
    }

    // Explicitly reject if dictionaryConfig is missing
    if (!cliOutput.dictionaryConfig) {
      throw new ComposerError(
        "Dictionary configuration is required",
        ErrorCodes.INVALID_ARGS
      );
    }

    // Ensure dictionaryConfig has required fields
    const config = cliOutput.dictionaryConfig;
    if (!config.name || !config.description || !config.version) {
      throw new ComposerError(
        "Dictionary configuration must include name, description, and version",
        ErrorCodes.INVALID_ARGS
      );
    }

    // Validate all input files are CSVs
    const invalidFiles = cliOutput.filePaths.filter(
      (filePath) => path.extname(filePath).toLowerCase() !== ".csv"
    );

    if (invalidFiles.length > 0) {
      throw new ComposerError(
        "Lectern dictionary generation requires CSV input files",
        ErrorCodes.INVALID_FILE,
        { invalidFiles: invalidFiles.join(", ") }
      );
    }

    // Validate CSV headers for all input files
    for (const filePath of cliOutput.filePaths) {
      const csvHeadersValid = await validateCSVHeaders(
        filePath,
        cliOutput.config.delimiter
      );
      if (!csvHeadersValid) {
        throw new ComposerError(
          `CSV file ${filePath} has invalid headers`,
          ErrorCodes.VALIDATION_FAILED
        );
      }
    }
  }

  protected async execute(cliOutput: CLIOutput): Promise<any> {
    const { outputPath, dictionaryConfig } = cliOutput;
    const delimiter = cliOutput.config.delimiter;

    console.log(chalk.cyan("\nGenerating Lectern dictionary..."));

    try {
      // Validate environment and ensure output directory exists
      await validateEnvironment({
        profile: Profiles.GENERATE_LECTERN_DICTIONARY,
        outputPath: outputPath,
      });

      const dictionary = generateDictionary(
        dictionaryConfig!.name,
        dictionaryConfig!.description,
        dictionaryConfig!.version
      );

      for (const filePath of cliOutput.filePaths) {
        try {
          const fileContent = fs.readFileSync(filePath, "utf-8");
          const [headerLine, sampleLine] = fileContent.split("\n");

          if (!headerLine) {
            throw new ComposerError(
              `CSV file ${filePath} is empty or has no headers`,
              ErrorCodes.INVALID_FILE
            );
          }

          const headers = parseCSVLine(headerLine, delimiter, true)[0];
          if (!headers) {
            throw new ComposerError(
              `Failed to parse CSV headers in ${filePath}`,
              ErrorCodes.INVALID_FILE
            );
          }

          // Get schema name from file name
          const schemaName = path
            .basename(filePath, path.extname(filePath))
            .toLowerCase()
            .replace(/[^a-z0-9]/g, "_");

          // Get sample data
          const sampleData: Record<string, string> = {};
          if (sampleLine) {
            const sampleValues = parseCSVLine(sampleLine, delimiter, false)[0];
            if (sampleValues) {
              headers.forEach((header: string, index: number) => {
                sampleData[header] = sampleValues[index] || "";
              });
            }
          }

          const schema = generateSchema(schemaName, headers, sampleData);
          dictionary.schemas.push(schema);
          console.log(chalk.green(`✓ Generated schema for ${schemaName}`));
        } catch (error) {
          console.error(
            chalk.yellow(`⚠ Skipping ${filePath} due to error:`),
            error
          );
          continue;
        }
      }

      // Write dictionary to file
      fs.writeFileSync(outputPath!, JSON.stringify(dictionary, null, 2));
      console.log(chalk.green(`\n✓ Dictionary saved to ${outputPath}`));

      // Return the generated dictionary to satisfy the test
      return dictionary;
    } catch (error) {
      if (error instanceof ComposerError) {
        throw error;
      }
      throw new ComposerError(
        "Error generating Lectern dictionary",
        ErrorCodes.GENERATION_FAILED,
        error
      );
    }
  }
}
