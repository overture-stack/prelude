// src/services/song/SongService.ts
import { BaseService } from "../base/baseService";
import { ServiceConfig } from "../base/types";
import { Logger } from "../../utils/logger";
import { ErrorFactory } from "../../utils/errors";
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
        throw ErrorFactory.parsing(
          "Invalid schema format",
          { originalError: error },
          [
            "Ensure schema file contains valid JSON",
            "Check for syntax errors",
            "Validate JSON structure",
          ]
        );
      }

      // Validate against SONG-specific requirements
      const { isValid, warnings } = validateSongSchema(schemaData);

      // Log any warnings
      if (warnings.length > 0) {
        Logger.warnString("Schema validation warnings:");
        warnings.forEach((warning) => {
          Logger.warnString(`  - ${warning}`);
        });
      }

      Logger.info`Uploading schema: ${schemaData.name}`;

      // Upload to SONG schemas endpoint
      const response = await this.http.post<SongSchemaUploadResponse>(
        "/schemas",
        schemaData
      );

      // Check for errors in response
      if (response.data?.error) {
        throw ErrorFactory.validation(
          "SONG API error",
          { error: response.data.error },
          [
            `Server error: ${response.data.error}`,
            "Check schema format and requirements",
          ]
        );
      }

      Logger.success`Schema "${schemaData.name}" uploaded successfully`;

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

      Logger.info`Creating study: ${params.studyId}`;

      // Check if study already exists
      const studyExists = await this.checkStudyExists(params.studyId);
      if (studyExists && !params.force) {
        Logger.warnString(`Study ID ${params.studyId} already exists`);
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

      Logger.success`Study created successfully`;

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
        throw ErrorFactory.parsing(
          "Invalid analysis format",
          { originalError: error },
          [
            "Ensure analysis file contains valid JSON",
            "Check for syntax errors in the analysis",
          ]
        );
      }

      // Basic validation of analysis structure
      if (!analysisData.analysisType || !analysisData.analysisType.name) {
        throw ErrorFactory.validation(
          "Invalid analysis format: Missing required field 'analysisType.name'",
          { analysisData },
          [
            "Add analysisType.name field to analysis",
            "Check analysis file structure",
          ]
        );
      }

      if (
        !analysisData.files ||
        !Array.isArray(analysisData.files) ||
        analysisData.files.length === 0
      ) {
        throw ErrorFactory.validation(
          "Invalid analysis format: 'files' must be a non-empty array",
          { analysisData },
          ["Add files array to analysis", "Ensure files array is not empty"]
        );
      }

      Logger.info`Submitting analysis to study: ${params.studyId}`;
      Logger.infoString(`Analysis type: ${analysisData.analysisType.name}`);

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
        throw ErrorFactory.connection(
          "No analysis ID returned from SONG API",
          { response: response.data },
          [
            "Check SONG service response format",
            "Verify analysis submission was processed",
          ]
        );
      }

      Logger.success`Analysis submitted successfully with ID: ${analysisId}`;

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

      Logger.info`Publishing analysis: ${params.analysisId}`;

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

      Logger.success`Analysis published successfully`;

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
   * Check if a study exists
   */
  private async checkStudyExists(studyId: string): Promise<boolean> {
    try {
      await this.http.get(`/studies/${studyId}`);
      return true;
    } catch (error) {
      // 404 means study doesn't exist
      if (this.isNotFoundError(error)) {
        return false;
      }
      // Other errors should be thrown
      throw error;
    }
  }

  /**
   * Check if error is a 409 conflict
   */
  private isConflictError(error: unknown): boolean {
    if (typeof error === "object" && error !== null && "response" in error) {
      const response = (error as any).response;
      return response?.status === 409;
    }
    return false;
  }

  /**
   * Check if error is a 404 not found
   */
  private isNotFoundError(error: unknown): boolean {
    if (typeof error === "object" && error !== null && "response" in error) {
      const response = (error as any).response;
      return response?.status === 404;
    }
    return false;
  }
}
