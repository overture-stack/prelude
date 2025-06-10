// src/commands/songSubmitAnalysisCommand.ts - Combined with scoreManifestUpload
import { Command, CommandResult } from "./baseCommand";
import { CLIOutput } from "../types/cli";
import { Logger } from "../utils/logger";
import chalk from "chalk";
import { ConductorError, ErrorCodes } from "../utils/errors";
import { SongScoreService } from "../services/song-score";
import { SongScoreWorkflowParams } from "../services/song-score/types";
import * as fs from "fs";
import * as path from "path";

/**
 * Combined command for SONG analysis submission and Score file upload
 * This replaces both songSubmitAnalysis and scoreManifestUpload commands
 */
export class SongSubmitAnalysisCommand extends Command {
  constructor() {
    super("SONG Analysis Submission & File Upload");
  }

  /**
   * Executes the combined SONG/Score workflow
   */
  protected async execute(cliOutput: CLIOutput): Promise<CommandResult> {
    const { options } = cliOutput;

    try {
      // Extract configuration
      const workflowParams = this.extractWorkflowParams(options);
      const serviceConfig = this.extractServiceConfig(options);
      const scoreConfig = this.extractScoreConfig(options);

      // Create combined service instance
      const songScoreService = new SongScoreService(serviceConfig, scoreConfig);

      // Check Docker requirements for Score operations
      await songScoreService.validateDockerRequirements();

      // Check services health
      const healthStatus = await songScoreService.checkServicesHealth();
      if (!healthStatus.overall) {
        const issues = [];
        if (!healthStatus.song) issues.push("SONG");
        if (!healthStatus.score) issues.push("Score");

        throw new ConductorError(
          `Service health check failed: ${issues.join(
            ", "
          )} service(s) not healthy`,
          ErrorCodes.CONNECTION_ERROR,
          { healthStatus }
        );
      }

      // Log workflow info
      this.logWorkflowInfo(workflowParams, serviceConfig.url, scoreConfig?.url);

      // Execute the complete workflow
      const result = await songScoreService.executeWorkflow(workflowParams);

      // Log success/partial success
      if (result.success) {
        this.logSuccess(result);
      } else {
        this.logPartialSuccess(result);
      }

      return {
        success: result.success,
        details: result,
      };
    } catch (error) {
      return this.handleExecutionError(error);
    }
  }

  /**
   * Validates command line arguments
   */
  protected async validate(cliOutput: CLIOutput): Promise<void> {
    const { options } = cliOutput;

    // Validate analysis file
    const analysisFile = this.getAnalysisFile(options);
    if (!analysisFile) {
      throw new ConductorError(
        "Analysis file not specified. Use --analysis-file or set ANALYSIS_FILE environment variable.",
        ErrorCodes.INVALID_ARGS
      );
    }

    if (!fs.existsSync(analysisFile)) {
      throw new ConductorError(
        `Analysis file not found: ${analysisFile}`,
        ErrorCodes.FILE_NOT_FOUND
      );
    }

    // Validate data directory
    const dataDir = this.getDataDir(options);
    if (!fs.existsSync(dataDir)) {
      throw new ConductorError(
        `Data directory not found: ${dataDir}`,
        ErrorCodes.FILE_NOT_FOUND
      );
    }

    // Validate SONG URL
    const songUrl = this.getSongUrl(options);
    if (!songUrl) {
      throw new ConductorError(
        "SONG URL not specified. Use --song-url or set SONG_URL environment variable.",
        ErrorCodes.INVALID_ARGS
      );
    }
  }

  /**
   * Extract workflow parameters from options
   */
  private extractWorkflowParams(options: any): SongScoreWorkflowParams {
    const analysisFile = this.getAnalysisFile(options)!;
    const analysisContent = fs.readFileSync(analysisFile, "utf-8");

    return {
      analysisContent,
      studyId: options.studyId || process.env.STUDY_ID || "demo",
      allowDuplicates: options.allowDuplicates || false,
      dataDir: this.getDataDir(options),
      manifestFile: this.getManifestFile(options),
      ignoreUndefinedMd5: options.ignoreUndefinedMd5 || false,
      songUrl: this.getSongUrl(options),
      scoreUrl: this.getScoreUrl(options),
      authToken: options.authToken || process.env.AUTH_TOKEN || "123",
    };
  }

  /**
   * Extract SONG service configuration
   */
  private extractServiceConfig(options: any) {
    return {
      url: this.getSongUrl(options)!,
      timeout: 20000,
      retries: 3,
      authToken: options.authToken || process.env.AUTH_TOKEN || "123",
    };
  }

  /**
   * Extract Score service configuration
   */
  private extractScoreConfig(options: any) {
    return {
      url: this.getScoreUrl(options),
      timeout: 30000,
      retries: 2,
      authToken: options.authToken || process.env.AUTH_TOKEN || "123",
    };
  }

  // Helper methods for extracting values
  private getAnalysisFile(options: any): string | undefined {
    return options.analysisFile || process.env.ANALYSIS_FILE;
  }

  private getDataDir(options: any): string {
    return options.dataDir || process.env.DATA_DIR || "./data";
  }

  private getManifestFile(options: any): string {
    const outputDir = options.outputDir || process.env.OUTPUT_DIR || "./output";
    return options.manifestFile || path.join(outputDir, "manifest.txt");
  }

  private getSongUrl(options: any): string | undefined {
    return options.songUrl || process.env.SONG_URL;
  }

  private getScoreUrl(options: any): string {
    return options.scoreUrl || process.env.SCORE_URL || "http://localhost:8087";
  }

  /**
   * Log workflow information
   */
  private logWorkflowInfo(
    params: SongScoreWorkflowParams,
    songUrl: string,
    scoreUrl?: string
  ): void {
    Logger.info(`${chalk.bold.cyan("SONG/Score Analysis Workflow:")}`);
    Logger.info(`SONG URL: ${songUrl}`);
    Logger.info(`Score URL: ${scoreUrl || "http://localhost:8087"}`);
    Logger.info(`Study ID: ${params.studyId}`);
    Logger.info(`Data Directory: ${params.dataDir}`);
    Logger.info(`Manifest File: ${params.manifestFile}`);
  }

  /**
   * Log successful workflow completion
   */
  private logSuccess(result: any): void {
    Logger.success("SONG/Score workflow completed successfully");
    Logger.generic(" ");
    Logger.generic(chalk.gray(`    - Analysis ID: ${result.analysisId}`));
    Logger.generic(chalk.gray(`    - Study ID: ${result.studyId}`));
    Logger.generic(chalk.gray(`    - Status: ${result.status}`));
    Logger.generic(chalk.gray(`    - Manifest File: ${result.manifestFile}`));
    Logger.generic(" ");
  }

  /**
   * Log partial success
   */
  private logPartialSuccess(result: any): void {
    Logger.warn("SONG/Score workflow completed with partial success");
    Logger.generic(" ");
    Logger.generic(chalk.gray(`    - Analysis ID: ${result.analysisId}`));
    Logger.generic(chalk.gray(`    - Study ID: ${result.studyId}`));
    Logger.generic(chalk.gray(`    - Status: ${result.status}`));
    Logger.generic(chalk.gray(`    - Steps completed:`));
    Logger.generic(
      chalk.gray(`      - Submitted: ${result.steps.submitted ? "✓" : "✗"}`)
    );
    Logger.generic(
      chalk.gray(`      - Uploaded: ${result.steps.uploaded ? "✓" : "✗"}`)
    );
    Logger.generic(
      chalk.gray(`      - Published: ${result.steps.published ? "✓" : "✗"}`)
    );
    Logger.generic(" ");
  }

  /**
   * Handle execution errors
   */
  private handleExecutionError(error: unknown): CommandResult {
    if (error instanceof ConductorError) {
      // Add context-specific help
      if (error.code === ErrorCodes.FILE_NOT_FOUND) {
        Logger.info("\nFile or directory issue. Check paths and permissions.");
      } else if (error.code === ErrorCodes.CONNECTION_ERROR) {
        Logger.info("\nConnection error. Check service availability.");
      }

      if (error.details?.suggestion) {
        Logger.tip(error.details.suggestion);
      }

      return {
        success: false,
        errorMessage: error.message,
        errorCode: error.code,
        details: error.details,
      };
    }

    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      errorMessage: `SONG/Score workflow failed: ${errorMessage}`,
      errorCode: ErrorCodes.CONNECTION_ERROR,
      details: { originalError: error },
    };
  }
}
