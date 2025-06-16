// src/commands/songSubmitAnalysisCommand.ts - Enhanced with ErrorFactory patterns
import { Command } from "./baseCommand";
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
 * Enhanced with ErrorFactory patterns and comprehensive validation
 */
export class SongSubmitAnalysisCommand extends Command {
  constructor() {
    super("SONG Analysis Submission & File Upload");
  }

  /**
   * Validates command line arguments with enhanced error messages
   */
  protected async validate(cliOutput: CLIOutput): Promise<void> {
    const { options } = cliOutput;

    Logger.debug`Validating SONG/Score workflow parameters`;

    // Enhanced validation for all required parameters
    this.validateAnalysisFile(options);
    this.validateDataDirectory(options);
    this.validateSongUrl(options);
    this.validateStudyId(options);
    this.validateScoreUrl(options);
    this.validateManifestFile(options);
    this.validateOptionalParameters(options);

    // Validate file contents
    await this.validateAnalysisFileContents(options);
    await this.validateDataDirectoryContents(options);

    Logger.successString("SONG/Score workflow parameters validated");
  }

  /**
   * Executes the combined SONG/Score workflow
   */
  protected async execute(cliOutput: CLIOutput): Promise<void> {
    const { options } = cliOutput;

    // Extract configuration with enhanced validation
    const workflowParams = this.extractWorkflowParams(options);
    const serviceConfig = this.extractServiceConfig(options);
    const scoreConfig = this.extractScoreConfig(options);

    Logger.info`Starting SONG/Score analysis workflow`;
    Logger.info`Study ID: ${workflowParams.studyId}`;
    Logger.info`Data Directory: ${workflowParams.dataDir}`;
    Logger.info`Manifest File: ${workflowParams.manifestFile}`;

    // Create combined service instance with enhanced error handling
    const songScoreService = new SongScoreService(serviceConfig, scoreConfig);

    // Enhanced Docker requirements validation
    Logger.info`Validating Docker requirements for Score operations...`;
    await songScoreService.validateDockerRequirements();

    // Enhanced services health check
    Logger.info`Checking SONG and Score services health...`;
    const healthStatus = await songScoreService.checkServicesHealth();
    if (!healthStatus.overall) {
      const issues = [];
      if (!healthStatus.song) issues.push("SONG");
      if (!healthStatus.score) issues.push("Score");

      throw ErrorFactory.connection(
        `Service health check failed: ${issues.join(
          ", "
        )} service(s) not healthy`,
        issues[0],
        undefined,
        [
          `Check that ${issues.join(" and ")} service(s) are running`,
          "Verify service URLs and connectivity",
          "Review service logs for errors",
          "Check Docker containers if using containerized services",
          "Ensure proper authentication and permissions",
        ]
      );
    }

    // Log workflow info with enhanced context
    this.logWorkflowInfo(workflowParams, serviceConfig.url, scoreConfig?.url);

    // Execute the complete workflow with enhanced progress tracking
    Logger.info`Executing SONG/Score workflow...`;
    const result = await songScoreService.executeWorkflow(workflowParams);

    // Enhanced success/partial success logging
    if (result.success) {
      this.logSuccess(result);
    } else {
      this.logPartialSuccess(result);
    }

    // Command completed successfully
  }

  /**
   * Enhanced analysis file validation
   */
  private validateAnalysisFile(options: any): void {
    const analysisFile = this.getAnalysisFile(options);

    if (!analysisFile) {
      throw ErrorFactory.args(
        "Analysis file not specified",
        "songSubmitAnalysis",
        [
          "Provide analysis file: conductor songSubmitAnalysis --analysis-file analysis.json",
          "Set ANALYSIS_FILE environment variable",
          "Analysis file should contain SONG analysis definition",
          "Ensure file path is correct and accessible",
        ]
      );
    }

    if (!fs.existsSync(analysisFile)) {
      throw ErrorFactory.file(
        `Analysis file not found: ${path.basename(analysisFile)}`,
        analysisFile,
        [
          "Check that the file path is correct",
          "Ensure the file exists at the specified location",
          "Verify file permissions allow read access",
          `Current directory: ${process.cwd()}`,
          "Use absolute path if relative path is not working",
        ]
      );
    }

    const stats = fs.statSync(analysisFile);
    if (stats.size === 0) {
      throw ErrorFactory.file(
        `Analysis file is empty: ${path.basename(analysisFile)}`,
        analysisFile,
        [
          "Ensure the file contains valid analysis definition",
          "Check if the file was properly created",
          "Verify the file is not corrupted",
        ]
      );
    }

    Logger.debug`Analysis file validated: ${analysisFile}`;
  }

  /**
   * Enhanced data directory validation
   */
  private validateDataDirectory(options: any): void {
    const dataDir = this.getDataDir(options);

    if (!fs.existsSync(dataDir)) {
      throw ErrorFactory.file(`Data directory not found: ${dataDir}`, dataDir, [
        "Check that the directory path is correct",
        "Ensure the directory exists",
        "Verify permissions allow access",
        `Current directory: ${process.cwd()}`,
        "Create the directory if it doesn't exist",
      ]);
    }

    const stats = fs.statSync(dataDir);
    if (!stats.isDirectory()) {
      throw ErrorFactory.file(`Path is not a directory: ${dataDir}`, dataDir, [
        "Provide a directory path, not a file path",
        "Check the path points to a directory",
        "Ensure the path is correct",
      ]);
    }

    Logger.debug`Data directory validated: ${dataDir}`;
  }

  /**
   * Enhanced SONG URL validation with protocol checking
   */
  private validateSongUrl(options: any): void {
    const songUrl = this.getSongUrl(options);

    if (!songUrl) {
      throw ErrorFactory.config("SONG service URL not configured", "songUrl", [
        "Set SONG URL: conductor songSubmitAnalysis --song-url http://localhost:8080",
        "Set SONG_URL environment variable",
        "Verify SONG service is running and accessible",
        "Check network connectivity to SONG service",
      ]);
    }

    try {
      const url = new URL(songUrl);
      if (!["http:", "https:"].includes(url.protocol)) {
        throw ErrorFactory.validation(
          `Invalid protocol in SONG URL: ${url.protocol}`,
          { songUrl, protocol: url.protocol },
          [
            "Protocol must be http or https",
            "Use format: http://localhost:8080 or https://song.example.com",
            "Check for typos in the URL",
            "Verify the correct protocol with your administrator",
          ]
        );
      }
      Logger.debug`Using SONG URL: ${songUrl}`;
    } catch (error) {
      if (error instanceof Error && error.name === "ConductorError") {
        throw error; // Re-throw enhanced errors
      }

      throw ErrorFactory.config(
        `Invalid SONG URL format: ${songUrl}`,
        "songUrl",
        [
          "Use a valid URL format: http://localhost:8080",
          "Include protocol (http:// or https://)",
          "Check for typos in the URL",
          "Verify port number is correct (usually 8080 for SONG)",
        ]
      );
    }
  }

  /**
   * Enhanced study ID validation
   */
  private validateStudyId(options: any): void {
    const studyId = options.studyId || process.env.STUDY_ID;

    if (!studyId) {
      throw ErrorFactory.args("Study ID not specified", "songSubmitAnalysis", [
        "Provide study ID: conductor songSubmitAnalysis --study-id my-study",
        "Set STUDY_ID environment variable",
        "Study must exist in SONG before submitting analysis",
        "Create study first with songCreateStudy command",
      ]);
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(studyId)) {
      throw ErrorFactory.validation(
        `Invalid study ID format: ${studyId}`,
        { studyId },
        [
          "Study ID must contain only letters, numbers, hyphens, and underscores",
          "Match the study ID used when creating the study",
          "Check for typos or extra characters",
        ]
      );
    }

    Logger.debug`Study ID validated: ${studyId}`;
  }

  /**
   * Enhanced Score URL validation with protocol checking
   */
  private validateScoreUrl(options: any): void {
    const scoreUrl = this.getScoreUrl(options);

    try {
      const url = new URL(scoreUrl);
      if (!["http:", "https:"].includes(url.protocol)) {
        throw ErrorFactory.validation(
          `Invalid protocol in Score URL: ${url.protocol}`,
          { scoreUrl, protocol: url.protocol },
          [
            "Protocol must be http or https",
            "Use format: http://localhost:8087 or https://score.example.com",
            "Check for typos in the URL",
            "Verify the correct protocol with your administrator",
          ]
        );
      }
      Logger.debug`Using Score URL: ${scoreUrl}`;
    } catch (error) {
      if (error instanceof Error && error.name === "ConductorError") {
        throw error; // Re-throw enhanced errors
      }

      throw ErrorFactory.config(
        `Invalid Score URL format: ${scoreUrl}`,
        "scoreUrl",
        [
          "Use a valid URL format: http://localhost:8087",
          "Include protocol (http:// or https://)",
          "Check for typos in the URL",
          "Verify port number is correct (usually 8087 for Score)",
        ]
      );
    }
  }

  /**
   * Enhanced manifest file validation
   */
  private validateManifestFile(options: any): void {
    const manifestFile = this.getManifestFile(options);
    const manifestDir = path.dirname(manifestFile);

    // Create output directory if it doesn't exist
    if (!fs.existsSync(manifestDir)) {
      try {
        fs.mkdirSync(manifestDir, { recursive: true });
        Logger.info`Created directory for manifest: ${manifestDir}`;
      } catch (error) {
        throw ErrorFactory.file(
          `Cannot create manifest directory: ${manifestDir}`,
          manifestDir,
          [
            "Check directory permissions",
            "Ensure parent directories exist",
            "Verify disk space is available",
            "Use a different output directory",
          ]
        );
      }
    }

    Logger.debug`Manifest file path validated: ${manifestFile}`;
  }

  /**
   * Validate optional parameters
   */
  private validateOptionalParameters(options: any): void {
    // Validate auth token if provided
    const authToken = options.authToken || process.env.AUTH_TOKEN;
    if (authToken && typeof authToken === "string" && authToken.trim() === "") {
      Logger.warn`Empty auth token provided - using empty token`;
    }

    // Validate boolean flags
    if (
      options.allowDuplicates !== undefined &&
      typeof options.allowDuplicates !== "boolean"
    ) {
      Logger.warn`Invalid allowDuplicates value, using false`;
    }

    if (
      options.ignoreUndefinedMd5 !== undefined &&
      typeof options.ignoreUndefinedMd5 !== "boolean"
    ) {
      Logger.warn`Invalid ignoreUndefinedMd5 value, using false`;
    }

    Logger.debug`Optional parameters validated`;
  }

  /**
   * Enhanced analysis file contents validation
   */
  private async validateAnalysisFileContents(options: any): Promise<void> {
    const analysisFile = this.getAnalysisFile(options)!;

    try {
      const fileContent = fs.readFileSync(analysisFile, "utf-8");

      // Parse JSON and validate structure
      let analysisData;
      try {
        analysisData = JSON.parse(fileContent);
      } catch (error) {
        throw ErrorFactory.file(
          `Invalid JSON format in analysis file: ${path.basename(
            analysisFile
          )}`,
          analysisFile,
          [
            "Check JSON syntax for errors (missing commas, brackets, quotes)",
            "Validate JSON structure using a JSON validator",
            "Ensure file encoding is UTF-8",
            "Try viewing the file in a JSON editor",
            error instanceof Error ? `JSON error: ${error.message}` : "",
          ].filter(Boolean)
        );
      }

      // Validate required SONG analysis fields
      if (!analysisData.analysisType || !analysisData.analysisType.name) {
        throw ErrorFactory.validation(
          `Missing required field 'analysisType.name' in analysis file`,
          { analysisFile, analysisData: Object.keys(analysisData) },
          [
            "Analysis must have 'analysisType' object with 'name' field",
            "Check SONG analysis schema requirements",
            "Ensure analysis type is properly defined",
            "Review SONG documentation for analysis structure",
          ]
        );
      }

      if (
        !analysisData.files ||
        !Array.isArray(analysisData.files) ||
        analysisData.files.length === 0
      ) {
        throw ErrorFactory.validation(
          `Missing or empty 'files' array in analysis file`,
          { analysisFile, filesCount: analysisData.files?.length || 0 },
          [
            "Analysis must include 'files' array with at least one file",
            "Each file should have objectId, fileName, and fileMd5sum",
            "Ensure files are properly defined in the analysis",
            "Check that file references match actual data files",
          ]
        );
      }

      // Validate files array structure
      const invalidFiles = analysisData.files.filter(
        (file: any, index: number) => {
          const hasObjectId =
            file.objectId && typeof file.objectId === "string";
          const hasFileName =
            file.fileName && typeof file.fileName === "string";
          const hasFileMd5sum =
            file.fileMd5sum && typeof file.fileMd5sum === "string";

          return !hasObjectId || !hasFileName || !hasFileMd5sum;
        }
      );

      if (invalidFiles.length > 0) {
        throw ErrorFactory.validation(
          `Invalid file entries in analysis (${invalidFiles.length} of ${analysisData.files.length})`,
          { analysisFile, invalidFileCount: invalidFiles.length },
          [
            "Each file must have 'objectId', 'fileName', and 'fileMd5sum'",
            "Check file entries are properly formatted",
            "Ensure all required fields are strings",
            "Review SONG file schema requirements",
          ]
        );
      }

      Logger.success`Analysis file structure validated: ${analysisData.analysisType.name} with ${analysisData.files.length} file(s)`;
    } catch (error) {
      if (error instanceof Error && error.name === "ConductorError") {
        throw error;
      }

      throw ErrorFactory.file(
        `Error validating analysis file: ${
          error instanceof Error ? error.message : String(error)
        }`,
        analysisFile,
        [
          "Check file permissions and accessibility",
          "Verify file is not corrupted",
          "Ensure file encoding is UTF-8",
          "Try opening the file manually to inspect content",
        ]
      );
    }
  }

  /**
   * Enhanced data directory contents validation
   */
  private async validateDataDirectoryContents(options: any): Promise<void> {
    const dataDir = this.getDataDir(options);

    try {
      const files = fs.readdirSync(dataDir);

      if (files.length === 0) {
        throw ErrorFactory.file(
          `Data directory is empty: ${path.basename(dataDir)}`,
          dataDir,
          [
            "Add data files to the directory",
            "Ensure files match those referenced in analysis file",
            "Check if files are in subdirectories",
            "Verify file paths are correct",
          ]
        );
      }

      // Check for common data file types
      const dataFiles = files.filter((file) => {
        const ext = path.extname(file).toLowerCase();
        return [
          ".vcf",
          ".bam",
          ".fastq",
          ".fq",
          ".sam",
          ".cram",
          ".bed",
          ".txt",
          ".tsv",
          ".csv",
        ].includes(ext);
      });

      if (dataFiles.length === 0) {
        Logger.warn`No common data file types found in directory`;
        Logger.tipString(
          "Ensure data files match those referenced in your analysis file"
        );
      } else {
        Logger.debug`Found ${dataFiles.length} data file(s) in directory`;
      }

      // Check for large files that might cause issues
      const largeFiles = files.filter((file) => {
        try {
          const filePath = path.join(dataDir, file);
          const stats = fs.statSync(filePath);
          return stats.size > 1024 * 1024 * 1024; // 1GB
        } catch {
          return false;
        }
      });

      if (largeFiles.length > 0) {
        Logger.warn`Large files detected (>1GB): ${largeFiles.join(", ")}`;
        Logger.tipString("Large files may take longer to upload and process");
      }
    } catch (error) {
      throw ErrorFactory.file(
        `Error reading data directory: ${
          error instanceof Error ? error.message : String(error)
        }`,
        dataDir,
        [
          "Check directory permissions",
          "Ensure directory is accessible",
          "Verify directory is not corrupted",
        ]
      );
    }
  }

  /**
   * Extract workflow parameters with validation
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
      timeout: 30000, // 30 seconds for analysis operations
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
      timeout: 300000, // 5 minutes for file uploads
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
   * Enhanced workflow information logging
   */
  private logWorkflowInfo(
    params: SongScoreWorkflowParams,
    songUrl: string,
    scoreUrl?: string
  ): void {
    Logger.info`${chalk.bold.cyan("SONG/Score Workflow Details:")}`;
    Logger.generic(`  SONG URL: ${songUrl}`);
    Logger.generic(`  Score URL: ${scoreUrl || "http://localhost:8087"}`);
    Logger.generic(`  Study ID: ${params.studyId}`);
    Logger.generic(`  Data Directory: ${params.dataDir}`);
    Logger.generic(`  Manifest File: ${params.manifestFile}`);
    Logger.generic(
      `  Allow Duplicates: ${params.allowDuplicates ? "Yes" : "No"}`
    );
    Logger.generic(
      `  Ignore Undefined MD5: ${params.ignoreUndefinedMd5 ? "Yes" : "No"}`
    );
  }

  /**
   * Enhanced successful workflow completion logging
   */
  private logSuccess(result: any): void {
    Logger.success`SONG/Score workflow completed successfully`;
    Logger.generic(" ");
    Logger.generic(chalk.gray(`    ✓ Analysis ID: ${result.analysisId}`));
    Logger.generic(chalk.gray(`    ✓ Study ID: ${result.studyId}`));
    Logger.generic(chalk.gray(`    ✓ Status: ${result.status}`));
    Logger.generic(chalk.gray(`    ✓ Manifest File: ${result.manifestFile}`));
    Logger.generic(
      chalk.gray(`    ✓ All Steps Completed: Submission → Upload → Publication`)
    );
    Logger.generic(" ");
    Logger.tipString(
      "Analysis is now available in SONG and files are uploaded to Score"
    );
  }

  /**
   * Enhanced partial success logging
   */
  private logPartialSuccess(result: any): void {
    Logger.warn`SONG/Score workflow completed with partial success`;
    Logger.generic(" ");
    Logger.generic(chalk.gray(`    ⚠ Analysis ID: ${result.analysisId}`));
    Logger.generic(chalk.gray(`    ⚠ Study ID: ${result.studyId}`));
    Logger.generic(chalk.gray(`    ⚠ Status: ${result.status}`));
    Logger.generic(chalk.gray(`    ⚠ Workflow Steps:`));
    Logger.generic(
      chalk.gray(
        `      - Analysis Submitted: ${result.steps.submitted ? "✓" : "✗"}`
      )
    );
    Logger.generic(
      chalk.gray(`      - Files Uploaded: ${result.steps.uploaded ? "✓" : "✗"}`)
    );
    Logger.generic(
      chalk.gray(
        `      - Analysis Published: ${result.steps.published ? "✓" : "✗"}`
      )
    );
    Logger.generic(" ");

    if (!result.steps.uploaded) {
      Logger.tipString(
        "Analysis was submitted but file upload failed - check Score service and file accessibility"
      );
    } else if (!result.steps.published) {
      Logger.tipString(
        "Analysis and files are ready but publication failed - try running songPublishAnalysis command"
      );
    }
  }
}
