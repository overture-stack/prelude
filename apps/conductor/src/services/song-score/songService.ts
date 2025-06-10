// src/services/song/SongService.ts
import { BaseService } from "../base/baseService";
import { ServiceConfig } from "../base/types";
import { Logger } from "../../utils/logger";
import { ConductorError, ErrorCodes } from "../../utils/errors";
import {
  SongSchemaUploadParams,
  SongSchemaUploadResponse,
  SongStudyCreateParams,
  SongStudyResponse,
  SongAnalysisSubmitParams,
  SongAnalysisResponse,
  SongPublishParams,
  SongPublishResponse,
} from "./types";
import { validateSongSchema } from "./songSchemaValidator";
import * as fs from "fs";

export class SongService extends BaseService {
  constructor(config: ServiceConfig) {
    super(config);
  }

  get serviceName(): string {
    return "SONG";
  }

  protected get healthEndpoint(): string {
    return "/isAlive";
  }

  /**
   * Upload a schema to SONG
   */
  async uploadSchema(
    params: SongSchemaUploadParams
  ): Promise<SongSchemaUploadResponse> {
    try {
      this.validateRequired(params, ["schemaContent"]);

      // Parse and validate JSON
      let schemaData: any;
      try {
        schemaData = JSON.parse(params.schemaContent);
      } catch (error) {
        throw new ConductorError(
          `Invalid schema format: ${
            error instanceof Error ? error.message : String(error)
          }`,
          ErrorCodes.INVALID_FILE,
          error
        );
      }

      // Validate against SONG-specific requirements
      const { isValid, warnings } = validateSongSchema(schemaData);

      // Log any warnings
      if (warnings.length > 0) {
        Logger.warn("Schema validation warnings:");
        warnings.forEach((warning) => {
          Logger.warn(`  - ${warning}`);
        });
      }

      Logger.info(`Uploading schema: ${schemaData.name}`);

      // Upload to SONG schemas endpoint
      const response = await this.http.post<SongSchemaUploadResponse>(
        "/schemas",
        schemaData
      );

      // Check for errors in response
      if (response.data?.error) {
        throw new ConductorError(
          `SONG API error: ${response.data.error}`,
          ErrorCodes.CONNECTION_ERROR
        );
      }

      Logger.success(`Schema "${schemaData.name}" uploaded successfully`);

      return response.data;
    } catch (error) {
      this.handleServiceError(error, "schema upload");
    }
  }

  /**
   * Create a new study in SONG
   */
  async createStudy(params: SongStudyCreateParams): Promise<SongStudyResponse> {
    try {
      this.validateRequired(params, ["studyId", "name", "organization"]);

      Logger.info(`Creating study: ${params.studyId}`);

      // Check if study already exists
      const studyExists = await this.checkStudyExists(params.studyId);
      if (studyExists && !params.force) {
        Logger.warn(`Study ID ${params.studyId} already exists`);
        return {
          studyId: params.studyId,
          name: params.name,
          organization: params.organization,
          status: "EXISTING",
          message: `Study ID ${params.studyId} already exists`,
        };
      }

      // Prepare study payload
      const studyPayload = {
        description: params.description || "string",
        info: {},
        name: params.name,
        organization: params.organization,
        studyId: params.studyId,
      };

      // Create study
      const response = await this.http.post<SongStudyResponse>(
        `/studies/${params.studyId}/`,
        studyPayload
      );

      Logger.success(`Study created successfully`);

      return {
        ...response.data,
        studyId: params.studyId,
        name: params.name,
        organization: params.organization,
        status: "CREATED",
      };
    } catch (error) {
      // Handle 409 conflict for existing studies
      if (this.isConflictError(error)) {
        return {
          studyId: params.studyId,
          name: params.name,
          organization: params.organization,
          status: "EXISTING",
          message: `Study ID ${params.studyId} already exists`,
        };
      }

      this.handleServiceError(error, "study creation");
    }
  }

  /**
   * Submit an analysis to SONG
   */
  async submitAnalysis(
    params: SongAnalysisSubmitParams
  ): Promise<SongAnalysisResponse> {
    try {
      this.validateRequired(params, ["analysisContent", "studyId"]);

      // Parse and validate analysis JSON
      let analysisData: any;
      try {
        analysisData = JSON.parse(params.analysisContent);
      } catch (error) {
        throw new ConductorError(
          `Invalid analysis format: ${
            error instanceof Error ? error.message : String(error)
          }`,
          ErrorCodes.INVALID_FILE,
          error
        );
      }

      // Basic validation of analysis structure
      if (!analysisData.analysisType || !analysisData.analysisType.name) {
        throw new ConductorError(
          "Invalid analysis format: Missing required field 'analysisType.name'",
          ErrorCodes.INVALID_FILE
        );
      }

      if (
        !analysisData.files ||
        !Array.isArray(analysisData.files) ||
        analysisData.files.length === 0
      ) {
        throw new ConductorError(
          "Invalid analysis format: 'files' must be a non-empty array",
          ErrorCodes.INVALID_FILE
        );
      }

      Logger.info(`Submitting analysis to study: ${params.studyId}`);
      Logger.info(`Analysis type: ${analysisData.analysisType.name}`);

      // Submit analysis
      const submitUrl = `/submit/${params.studyId}?allowDuplicates=${
        params.allowDuplicates || false
      }`;
      const response = await this.http.post<any>(
        submitUrl,
        params.analysisContent,
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      // Extract analysis ID from response
      let analysisId = "";
      if (response.data && typeof response.data === "object") {
        analysisId = response.data.analysisId || "";
      } else if (typeof response.data === "string") {
        const match = response.data.match(/"analysisId"\s*:\s*"([^"]+)"/);
        if (match && match[1]) {
          analysisId = match[1];
        }
      }

      if (!analysisId) {
        throw new ConductorError(
          "No analysis ID returned from SONG API",
          ErrorCodes.CONNECTION_ERROR
        );
      }

      Logger.success(`Analysis submitted successfully with ID: ${analysisId}`);

      return {
        analysisId,
        studyId: params.studyId,
        analysisType: analysisData.analysisType.name,
        status: "CREATED",
      };
    } catch (error) {
      this.handleServiceError(error, "analysis submission");
    }
  }

  /**
   * Publish an analysis in SONG
   */
  async publishAnalysis(
    params: SongPublishParams
  ): Promise<SongPublishResponse> {
    try {
      this.validateRequired(params, ["analysisId", "studyId"]);

      Logger.info(`Publishing analysis: ${params.analysisId}`);

      // Construct the publish endpoint URL
      const publishUrl = `/studies/${params.studyId}/analysis/publish/${params.analysisId}`;

      // Set up query parameters
      const queryParams: Record<string, any> = {};
      if (params.ignoreUndefinedMd5) {
        queryParams.ignoreUndefinedMd5 = true;
      }

      // Make the PUT request to publish
      const response = await this.http.put(publishUrl, null, {
        params: queryParams,
      });

      Logger.success(`Analysis published successfully`);

      return {
        analysisId: params.analysisId,
        studyId: params.studyId,
        status: "PUBLISHED",
        message:
          typeof response.data === "object" &&
          response.data !== null &&
          "message" in response.data
            ? String(response.data.message)
            : "Successfully published",
      };
    } catch (error) {
      this.handleServiceError(error, "analysis publication");
    }
  }

  /**
   * Get all studies from SONG server
   */
  async getAllStudies(): Promise<string[]> {
    try {
      const response = await this.http.get<string[]>("/studies/all");
      return Array.isArray(response.data)
        ? response.data
        : [response.data as string];
    } catch (error) {
      this.handleServiceError(error, "get all studies");
    }
  }

  /**
   * Get analysis details from SONG
   */
  async getAnalysis(studyId: string, analysisId: string): Promise<any> {
    try {
      const response = await this.http.get(
        `/studies/${studyId}/analysis/${analysisId}`
      );
      return response.data;
    } catch (error) {
      this.handleServiceError(error, "get analysis");
    }
  }

  /**
   * Find which study contains a specific analysis
   */
  async findAnalysisInStudies(
    analysisId: string
  ): Promise<{ studyId: string; analysis: any } | null> {
    try {
      const studies = await this.getAllStudies();

      for (const studyId of studies) {
        try {
          const analysis = await this.getAnalysis(studyId, analysisId);
          if (analysis) {
            return { studyId, analysis };
          }
        } catch (error) {
          // Continue to next study if analysis not found
          continue;
        }
      }

      return null;
    } catch (error) {
      Logger.warn(`Could not find analysis ${analysisId}: ${error}`);
      return null;
    }
  }

  /**
   * Check if a study exists
   */
  private async checkStudyExists(studyId: string): Promise<boolean> {
    try {
      const response = await this.http.get(`/studies/${studyId}`);
      return response.status === 200;
    } catch (error: any) {
      // If we get a 404, study doesn't exist
      if (error.response && error.response.status === 404) {
        return false;
      }
      // For other errors, assume study doesn't exist
      return false;
    }
  }

  /**
   * Check if error is a conflict (409) error
   */
  private isConflictError(error: any): boolean {
    return error.response && error.response.status === 409;
  }
}
