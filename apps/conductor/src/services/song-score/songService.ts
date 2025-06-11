// src/services/song-score/songService.ts - Enhanced with ErrorFactory patterns
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
        throw ErrorFactory.validation(
          "Invalid JSON format in SONG schema",
          { error: error instanceof Error ? error.message : String(error) },
          [
            "Check JSON syntax for errors (missing commas, brackets, quotes)",
            "Validate JSON structure using a JSON validator",
            "Ensure file encoding is UTF-8",
            "Try viewing the file in a JSON editor",
            error instanceof Error ? `JSON error: ${error.message}` : "",
          ].filter(Boolean)
        );
      }

      // Validate against SONG-specific requirements
      const { isValid, warnings } = validateSongSchema(schemaData);

      if (warnings.length > 0) {
        Logger.warn`Schema validation warnings:`;
        warnings.forEach((warning) => Logger.warn`  - ${warning}`);
      }

      Logger.info`Uploading schema: ${schemaData.name}`;

      const response = await this.http.post<SongSchemaUploadResponse>(
        "/schemas",
        schemaData
      );

      if (response.data?.error) {
        throw ErrorFactory.connection(
          `SONG API error: ${response.data.error}`,
          "SONG",
          this.config.url,
          [
            "Check schema format and structure",
            "Verify SONG service is properly configured",
            "Review schema for required fields and valid values",
            "Check SONG service logs for additional details",
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
        Logger.warn`Study ID ${params.studyId} already exists`;
        return {
          studyId: params.studyId,
          name: params.name,
          organization: params.organization,
          status: "EXISTING",
          message: `Study ID ${params.studyId} already exists`,
        };
      }

      const studyPayload = {
        description: params.description || "string",
        info: {},
        name: params.name,
        organization: params.organization,
        studyId: params.studyId,
      };

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
        throw ErrorFactory.validation(
          "Invalid JSON format in analysis file",
          { error: error instanceof Error ? error.message : String(error) },
          [
            "Check JSON syntax for errors (missing commas, brackets, quotes)",
            "Validate JSON structure using a JSON validator",
            "Ensure file encoding is UTF-8",
            "Try viewing the file in a JSON editor",
            error instanceof Error ? `JSON error: ${error.message}` : "",
          ].filter(Boolean)
        );
      }

      // Basic validation of analysis structure
      if (!analysisData.analysisType || !analysisData.analysisType.name) {
        throw ErrorFactory.validation(
          "Missing required field 'analysisType.name' in analysis file",
          { analysisData: Object.keys(analysisData) },
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
          "Missing or empty 'files' array in analysis file",
          { filesCount: analysisData.files?.length || 0 },
          [
            "Analysis must include 'files' array with at least one file",
            "Each file should have objectId, fileName, and fileMd5sum",
            "Ensure files are properly defined in the analysis",
            "Check that file references match actual data files",
          ]
        );
      }

      Logger.info`Submitting analysis to study: ${params.studyId}`;
      Logger.info`Analysis type: ${analysisData.analysisType.name}`;

      const submitUrl = `/submit/${params.studyId}?allowDuplicates=${
        params.allowDuplicates || false
      }`;
      const response = await this.http.post<any>(
        submitUrl,
        params.analysisContent,
        {
          headers: { "Content-Type": "application/json" },
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
          "SONG",
          this.config.url,
          [
            "SONG service may not be responding correctly",
            "Check SONG API response format",
            "Verify analysis submission was successful",
            "Review SONG service logs for errors",
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

      const publishUrl = `/studies/${params.studyId}/analysis/publish/${params.analysisId}`;
      const queryParams: Record<string, any> = {};
      if (params.ignoreUndefinedMd5) {
        queryParams.ignoreUndefinedMd5 = true;
      }

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
          continue;
        }
      }

      return null;
    } catch (error) {
      Logger.warn`Could not find analysis ${analysisId}: ${error}`;
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
      if (error.response && error.response.status === 404) {
        return false;
      }
      return false;
    }
  }

  /**
   * Check if error is a conflict (409) error
   */
  private isConflictError(error: any): boolean {
    return error.response && error.response.status === 409;
  }

  /**
   * Enhanced service error handling with SONG-specific context
   */
  protected handleServiceError(error: unknown, operation: string): never {
    if (error instanceof Error && error.name === "ConductorError") {
      throw error;
    }

    const errorMessage = error instanceof Error ? error.message : String(error);

    let suggestions = [
      `Check that SONG service is running and accessible`,
      `Verify service URL: ${this.config.url}`,
      "Check network connectivity and firewall settings",
      "Confirm SONG service configuration",
      "Review SONG service logs for additional details",
    ];

    // Add operation-specific suggestions
    if (operation === "schema upload") {
      suggestions = [
        "Verify schema format follows SONG requirements",
        "Ensure schema has required 'name' and 'schema' fields",
        "Check for valid JSON structure and syntax",
        ...suggestions,
      ];
    } else if (operation === "study creation") {
      suggestions = [
        "Check if study ID already exists",
        "Verify study parameters are valid",
        "Ensure organization name is correct",
        ...suggestions,
      ];
    } else if (operation === "analysis submission") {
      suggestions = [
        "Verify analysis format and structure",
        "Check that study exists in SONG",
        "Ensure analysis type is properly defined",
        "Verify file references in analysis",
        ...suggestions,
      ];
    } else if (operation === "analysis publication") {
      suggestions = [
        "Check that analysis exists and is in UNPUBLISHED state",
        "Verify all required files are uploaded",
        "Ensure analysis passed validation checks",
        ...suggestions,
      ];
    }

    // Handle specific HTTP status codes
    if (errorMessage.includes("404")) {
      suggestions.unshift("Resource not found in SONG");
      suggestions.unshift("Check that the specified resource exists");
    } else if (
      errorMessage.includes("409") ||
      errorMessage.includes("conflict")
    ) {
      suggestions.unshift("Resource conflict - may already exist");
      suggestions.unshift("Check for duplicate IDs or existing resources");
    } else if (
      errorMessage.includes("400") ||
      errorMessage.includes("validation")
    ) {
      suggestions.unshift("Request validation failed");
      suggestions.unshift("Check request parameters and format");
    } else if (errorMessage.includes("401") || errorMessage.includes("403")) {
      suggestions.unshift("Authentication or authorization failed");
      suggestions.unshift("Check API credentials and permissions");
    }

    throw ErrorFactory.connection(
      `SONG ${operation} failed: ${errorMessage}`,
      "SONG",
      this.config.url,
      suggestions
    );
  }
}
