// src/commands/songSubmitAnalysisCommand.ts - Updated with error factory pattern
import { Command, CommandResult } from "./baseCommand";
import { CLIOutput } from "../types/cli";
import { Logger } from "../utils/logger";
import chalk from "chalk";
import { ErrorFactory } from "../utils/errors";
import { SongScoreService } from "../services/song-score";
import { SongScoreWorkflowParams } from "../services/song-score/types";
import * as fs from "fs";
import * as path from "path";

/**
 * Combined command for SONG analysis submission and Score file upload
 * This replaces both songSubmitAnalysis and scoreManifestUpload commands
 * Updated to use error factory pattern for consistent error handling
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

        throw ErrorFactory.connection(
          `Service health check failed: ${issues.join(
            ", "
          )} service(s) not healthy`,
          { healthStatus },
          [
            "Check that SONG service is running and accessible",
            "Check that Score service is running and accessible",
            "Verify Docker containers are properly configured",
            "Review service logs for errors",
          ]
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
      throw ErrorFactory.args("Analysis file not specified", [
        "Use --analysis-file option to specify the analysis file",
        "Set ANALYSIS_FILE environment variable",
        "Example: --analysis-file ./analysis.json",
      ]);
    }

    if (!fs.existsSync(analysisFile)) {
      throw ErrorFactory.file("Analysis file not found", analysisFile, [
        "Check that the file exists",
        "Verify the file path is correct",
        "Ensure you have read access to the file",
      ]);
    }

    // Validate it's a JSON file
    if (!analysisFile.toLowerCase().endsWith(".json")) {
      throw ErrorFactory.invalidFile(
        "Analysis file must be a JSON file",
        analysisFile,
        [
          "Ensure the file has a .json extension",
          "Verify the file contains valid JSON content",
        ]
      );
    }

    // Validate data directory
    const dataDir = this.getDataDir(options);
    if (!fs.existsSync(dataDir)) {
      throw ErrorFactory.file("Data directory not found", dataDir, [
        "Check that the directory exists",
        "Verify the directory path is correct",
        "Ensure you have access to the directory",
      ]);
    }

    // Validate SONG URL
    const songUrl = this.getSongUrl(options);
    if (!songUrl) {
      throw ErrorFactory.args("SONG URL not specified", [
        "Use --song-url option to specify SONG server URL",
        "Set SONG_URL environment variable",
        "Example: --song-url http://localhost:8080",
      ]);
    }
  }

  /**
   * Extract workflow parameters from options
   */
  private extractWorkflowParams(options: any): SongScoreWorkflowParams {
    const analysisFile = this.getAnalysisFile(options)!;

    try {
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
    } catch (error) {
      throw ErrorFactory.file("Error reading analysis file", analysisFile, [
        "Check file permissions",
        "Verify the file is not corrupted",
        "Ensure the file contains valid JSON",
      ]);
    }
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
    Logger.info`${chalk.bold.cyan("SONG/Score Analysis Workflow:")}`;
    Logger.infoString(`SONG URL: ${songUrl}`);
    Logger.infoString(`Score URL: ${scoreUrl || "http://localhost:8087"}`);
    Logger.infoString(`Study ID: ${params.studyId}`);
    Logger.infoString(`Data Directory: ${params.dataDir}`);
    Logger.infoString(`Manifest File: ${params.manifestFile}`);
  }

  /**
   * Log successful workflow completion
   */
  private logSuccess(result: any): void {
    Logger.successString("SONG/Score workflow completed successfully");
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
    Logger.warnString("SONG/Score workflow completed with partial success");
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
   * Handle execution errors with helpful user feedback
   */
  private handleExecutionError(error: unknown): CommandResult {
    if (error instanceof Error && error.name === "ConductorError") {
      const conductorError = error as any;
      return {
        success: false,
        errorMessage: conductorError.message,
        errorCode: conductorError.code,
        details: conductorError.details,
      };
    }

    // Handle unexpected errors with categorization
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Connection errors
    if (
      errorMessage.includes("ECONNREFUSED") ||
      errorMessage.includes("ETIMEDOUT")
    ) {
      const connectionError = ErrorFactory.connection(
        "Failed to connect to SONG/Score services",
        { originalError: error },
        [
          "Check that SONG and Score services are running",
          "Verify service URLs and ports",
          "Check network connectivity",
          "Review firewall settings",
        ]
      );

      return {
        success: false,
        errorMessage: connectionError.message,
        errorCode: connectionError.code,
        details: connectionError.details,
      };
    }

    // Docker errors
    if (errorMessage.includes("docker") || errorMessage.includes("container")) {
      const dockerError = ErrorFactory.args(
        "Docker-related error in workflow",
        [
          "Ensure Docker is installed and running",
          "Check that required containers are available",
          "Verify Docker container configuration",
          "Review Docker logs for more details",
        ]
      );

      return {
        success: false,
        errorMessage: dockerError.message,
        errorCode: dockerError.code,
        details: dockerError.details,
      };
    }

    // File/directory errors
    if (errorMessage.includes("ENOENT") || errorMessage.includes("file")) {
      const fileError = ErrorFactory.file(
        "File or directory issue in workflow",
        undefined,
        [
          "Check that all required files exist",
          "Verify file and directory permissions",
          "Ensure paths are correct",
        ]
      );

      return {
        success: false,
        errorMessage: fileError.message,
        errorCode: fileError.code,
        details: fileError.details,
      };
    }

    // Authentication errors
    if (errorMessage.includes("401") || errorMessage.includes("403")) {
      const authError = ErrorFactory.auth(
        "Authentication failed in workflow",
        { originalError: error },
        [
          "Check authentication tokens for SONG and Score",
          "Verify you have permissions for the operations",
          "Contact administrator for access",
        ]
      );

      return {
        success: false,
        errorMessage: authError.message,
        errorCode: authError.code,
        details: authError.details,
      };
    }

    // Generic fallback
    const genericError = ErrorFactory.connection(
      "SONG/Score workflow failed",
      { originalError: error },
      [
        "Check service availability and configuration",
        "Verify all required parameters are provided",
        "Use --debug for detailed error information",
        "Review service logs for more details",
      ]
    );

    return {
      success: false,
      errorMessage: genericError.message,
      errorCode: genericError.code,
      details: genericError.details,
    };
  }
}
