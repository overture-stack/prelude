// src/services/song/SongScoreService.ts
import { BaseService } from "../base/baseService";
import { ServiceConfig } from "../base/types";
import { Logger } from "../../utils/logger";
import { SongService } from "./songService";
import { ScoreService } from "./scoreService";
import { SongScoreWorkflowParams, SongScoreWorkflowResponse } from "./types";

/**
 * Combined service for SONG/Score workflows
 * Handles the complete end-to-end process of:
 * 1. Submitting analysis to SONG
 * 2. Generating manifest and uploading files to Score
 * 3. Publishing analysis in SONG
 */
export class SongScoreService extends BaseService {
  private songService: SongService;
  private scoreService: ScoreService;

  constructor(config: ServiceConfig, scoreConfig?: ServiceConfig) {
    super(config);

    // Initialize Song service with main config
    this.songService = new SongService(config);

    // Initialize Score service with separate config or default
    this.scoreService = new ScoreService(
      scoreConfig || {
        url: process.env.SCORE_URL || "http://localhost:8087",
        timeout: 30000,
        authToken: config.authToken,
      }
    );
  }

  get serviceName(): string {
    return "SONG/Score";
  }

  protected get healthEndpoint(): string {
    return "/isAlive"; // Use SONG's health endpoint as primary
  }

  /**
   * Execute complete SONG/Score workflow
   */
  async executeWorkflow(
    params: SongScoreWorkflowParams
  ): Promise<SongScoreWorkflowResponse> {
    const steps = {
      submitted: false,
      uploaded: false,
      published: false,
    };

    let analysisId = "";

    try {
      this.validateRequired(params, [
        "analysisContent",
        "studyId",
        "dataDir",
        "manifestFile",
      ]);

      Logger.info(`Starting SONG/Score workflow for study: ${params.studyId}`);

      // Step 1: Submit analysis to SONG
      Logger.info(`Step 1: Submitting analysis to SONG`);
      const analysisResponse = await this.songService.submitAnalysis({
        analysisContent: params.analysisContent,
        studyId: params.studyId,
        allowDuplicates: params.allowDuplicates,
      });

      analysisId = analysisResponse.analysisId;
      steps.submitted = true;
      Logger.success(`Analysis submitted with ID: ${analysisId}`);

      // Step 2: Generate manifest and upload files to Score
      Logger.info(`Step 2: Generating manifest and uploading files to Score`);
      await this.scoreService.uploadWithManifest({
        analysisId,
        dataDir: params.dataDir,
        manifestFile: params.manifestFile,
        songUrl: params.songUrl,
        authToken: params.authToken,
      });

      steps.uploaded = true;
      Logger.success(`Files uploaded successfully to Score`);

      // Step 3: Publish analysis in SONG
      Logger.info(`Step 3: Publishing analysis in SONG`);
      await this.songService.publishAnalysis({
        analysisId,
        studyId: params.studyId,
        ignoreUndefinedMd5: params.ignoreUndefinedMd5,
      });

      steps.published = true;
      Logger.success(`Analysis published successfully`);

      Logger.success(`SONG/Score workflow completed successfully`);

      return {
        success: true,
        analysisId,
        studyId: params.studyId,
        manifestFile: params.manifestFile,
        status: "COMPLETED",
        steps,
        message: "Workflow completed successfully",
      };
    } catch (error) {
      // Determine the status based on which steps completed
      let status: "COMPLETED" | "PARTIAL" | "FAILED" = "FAILED";

      if (steps.submitted && steps.uploaded && !steps.published) {
        status = "PARTIAL";
      } else if (steps.submitted && !steps.uploaded) {
        status = "PARTIAL";
      }

      const errorMessage =
        error instanceof Error ? error.message : String(error);

      Logger.error(`SONG/Score workflow failed: ${errorMessage}`);

      // Log which steps completed
      Logger.info(`Workflow status:`);
      Logger.info(`  - Analysis submitted: ${steps.submitted ? "✓" : "✗"}`);
      Logger.info(`  - Files uploaded: ${steps.uploaded ? "✓" : "✗"}`);
      Logger.info(`  - Analysis published: ${steps.published ? "✓" : "✗"}`);

      return {
        success: false,
        analysisId,
        studyId: params.studyId,
        manifestFile: params.manifestFile,
        status,
        steps,
        message: `Workflow failed: ${errorMessage}`,
      };
    }
  }

  /**
   * Check health of both SONG and Score services
   */
  async checkServicesHealth(): Promise<{
    song: boolean;
    score: boolean;
    overall: boolean;
  }> {
    try {
      const [songHealth, scoreHealth] = await Promise.allSettled([
        this.songService.checkHealth(),
        this.scoreService.checkHealth(),
      ]);

      const songHealthy =
        songHealth.status === "fulfilled" && songHealth.value.healthy;
      const scoreHealthy =
        scoreHealth.status === "fulfilled" && scoreHealth.value.healthy;

      return {
        song: songHealthy,
        score: scoreHealthy,
        overall: songHealthy && scoreHealthy,
      };
    } catch (error) {
      Logger.warn(`Error checking services health: ${error}`);
      return {
        song: false,
        score: false,
        overall: false,
      };
    }
  }

  /**
   * Validate Docker availability for Score operations
   */
  async validateDockerRequirements(): Promise<void> {
    try {
      await this.scoreService.validateDockerAvailability();
    } catch (error) {
      this.handleServiceError(error, "Docker validation");
    }
  }
}
