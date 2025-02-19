import chalk from "chalk";

export class ComposerError extends Error {
  constructor(message: string, public code: string, public details?: any) {
    super(message);
    this.name = "ComposerError";
  }
}

export const ErrorCodes = {
  INVALID_ARGS: "INVALID_ARGS",
  FILE_NOT_FOUND: "FILE_NOT_FOUND",
  INVALID_FILE: "INVALID_FILE",
  VALIDATION_FAILED: "VALIDATION_FAILED",
  ENV_ERROR: "ENV_ERROR",
  GENERATION_FAILED: "GENERATION_FAILED",
  PARSING_ERROR: "PARSING_ERROR",
  FILE_ERROR: "FILE_ERROR",
  // Add the new error code
  FILE_WRITE_ERROR: "FILE_WRITE_ERROR",
} as const;

export function handleError(error: unknown): never {
  if (error instanceof ComposerError) {
    console.error(chalk.red(`\n❌ Error [${error.code}]: ${error.message}`));
    if (error.details) {
      console.error(chalk.yellow("\nDetails:"), error.details);
    }
  } else {
    console.error(chalk.red("\n❌ Unexpected error:"), error);
  }
  process.exit(1);
}
