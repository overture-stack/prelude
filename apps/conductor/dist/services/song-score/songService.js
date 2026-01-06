"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SongService = void 0;
// src/services/song/SongService.ts
const baseService_1 = require("../base/baseService");
const logger_1 = require("../../utils/logger");
const errors_1 = require("../../utils/errors");
const songSchemaValidator_1 = require("./songSchemaValidator");
class SongService extends baseService_1.BaseService {
    constructor(config) {
        super(config);
    }
    get serviceName() {
        return "SONG";
    }
    get healthEndpoint() {
        return "/isAlive";
    }
    /**
     * Upload a schema to SONG
     */
    async uploadSchema(params) {
        var _a;
        try {
            this.validateRequired(params, ["schemaContent"]);
            // Parse and validate JSON
            let schemaData;
            try {
                schemaData = JSON.parse(params.schemaContent);
            }
            catch (error) {
                throw errors_1.ErrorFactory.parsing("Invalid schema format", { originalError: error }, [
                    "Ensure schema file contains valid JSON",
                    "Check for syntax errors",
                    "Validate JSON structure",
                ]);
            }
            // Validate against SONG-specific requirements
            const { isValid, warnings } = (0, songSchemaValidator_1.validateSongSchema)(schemaData);
            // Log any warnings
            if (warnings.length > 0) {
                logger_1.Logger.warnString("Schema validation warnings:");
                warnings.forEach((warning) => {
                    logger_1.Logger.warnString(`  - ${warning}`);
                });
            }
            logger_1.Logger.info `Uploading schema: ${schemaData.name}`;
            // Upload to SONG schemas endpoint
            const response = await this.http.post("/schemas", schemaData);
            // Check for errors in response
            if ((_a = response.data) === null || _a === void 0 ? void 0 : _a.error) {
                throw errors_1.ErrorFactory.validation("SONG API error", { error: response.data.error }, [
                    `Server error: ${response.data.error}`,
                    "Check schema format and requirements",
                ]);
            }
            logger_1.Logger.debug `Schema "${schemaData.name}" uploaded successfully`;
            return response.data;
        }
        catch (error) {
            this.handleServiceError(error, "schema upload");
        }
    }
    /**
     * Create a new study in SONG
     * FIXED: Skip existence check and handle 409 directly during creation
     */
    async createStudy(params) {
        try {
            this.validateRequired(params, ["studyId", "name", "organization"]);
            logger_1.Logger.debug `Creating study: ${params.name} with ID: ${params.studyId}`;
            // FIXED: Skip the checkStudyExists call and handle conflicts during creation
            // The existence check was causing "Resource not found" errors
            // Prepare study payload
            const studyPayload = {
                description: params.description || "string",
                info: {},
                name: params.name,
                organization: params.organization,
                studyId: params.studyId,
            };
            logger_1.Logger.debug `Study payload: ${JSON.stringify(studyPayload)}`;
            // Create study - let SONG service handle existence checking
            const response = await this.http.post(`/studies/${params.studyId}/`, studyPayload);
            logger_1.Logger.debug `Study creation response: ${JSON.stringify(response.data)}`;
            logger_1.Logger.debug `Study created successfully`;
            return {
                ...response.data,
                studyId: params.studyId,
                name: params.name,
                organization: params.organization,
                status: "CREATED",
            };
        }
        catch (error) {
            logger_1.Logger.debug `Study creation error: ${error}`;
            // Handle 409 conflict for existing studies
            if (this.isConflictError(error)) {
                logger_1.Logger.debug `409 conflict detected - study already exists`;
                // If force flag is set, treat as success
                if (params.force) {
                    logger_1.Logger.warnString(`Study exists but continuing due to --force flag`);
                    return {
                        studyId: params.studyId,
                        name: params.name,
                        organization: params.organization,
                        status: "EXISTING",
                        message: `Study ID ${params.studyId} already exists (forced)`,
                    };
                }
                // Otherwise, throw a proper error
                throw errors_1.ErrorFactory.validation(`Study '${params.studyId}' already exists`, {
                    studyId: params.studyId,
                    studyName: params.name,
                    organization: params.organization,
                    httpStatus: 409,
                    errorType: "study_already_exists",
                }, [
                    "Use --force flag to acknowledge existing study",
                    "Choose a different study ID",
                    "Check if study creation is actually needed",
                    `Existing study ID: '${params.studyId}'`,
                ]);
            }
            this.handleServiceError(error, "study creation");
        }
    }
    /**
     * Submit an analysis to SONG
     */
    async submitAnalysis(params) {
        try {
            this.validateRequired(params, ["analysisContent", "studyId"]);
            // Parse and validate analysis JSON
            let analysisData;
            try {
                analysisData = JSON.parse(params.analysisContent);
            }
            catch (error) {
                throw errors_1.ErrorFactory.parsing("Invalid analysis format", { originalError: error }, [
                    "Ensure analysis file contains valid JSON",
                    "Check for syntax errors in the analysis",
                ]);
            }
            // Basic validation of analysis structure
            if (!analysisData.analysisType || !analysisData.analysisType.name) {
                throw errors_1.ErrorFactory.validation("Invalid analysis format: Missing required field 'analysisType.name'", { analysisData }, [
                    "Add analysisType.name field to analysis",
                    "Check analysis file structure",
                ]);
            }
            if (!analysisData.files ||
                !Array.isArray(analysisData.files) ||
                analysisData.files.length === 0) {
                throw errors_1.ErrorFactory.validation("Invalid analysis format: 'files' must be a non-empty array", { analysisData }, ["Add files array to analysis", "Ensure files array is not empty"]);
            }
            logger_1.Logger.debug `Submitting analysis to study: ${params.studyId}`;
            logger_1.Logger.debug `Analysis type: ${analysisData.analysisType.name}`;
            // Submit analysis
            const submitUrl = `/submit/${params.studyId}?allowDuplicates=${params.allowDuplicates || false}`;
            const response = await this.http.post(submitUrl, params.analysisContent, {
                headers: {
                    "Content-Type": "application/json",
                },
            });
            // Extract analysis ID from response
            let analysisId = "";
            if (response.data && typeof response.data === "object") {
                analysisId = response.data.analysisId || "";
            }
            else if (typeof response.data === "string") {
                const match = response.data.match(/"analysisId"\s*:\s*"([^"]+)"/);
                if (match && match[1]) {
                    analysisId = match[1];
                }
            }
            if (!analysisId) {
                throw errors_1.ErrorFactory.connection("No analysis ID returned from SONG API", { response: response.data }, [
                    "Check SONG service response format",
                    "Verify analysis submission was processed",
                ]);
            }
            logger_1.Logger.debug `Analysis submitted successfully with ID: ${analysisId}`;
            return {
                analysisId,
                studyId: params.studyId,
                analysisType: analysisData.analysisType.name,
                status: "CREATED",
            };
        }
        catch (error) {
            this.handleServiceError(error, "analysis submission");
        }
    }
    /**
     * Publish an analysis in SONG
     */
    async publishAnalysis(params) {
        try {
            this.validateRequired(params, ["analysisId", "studyId"]);
            logger_1.Logger.info `Publishing analysis: ${params.analysisId}`;
            // Construct the publish endpoint URL
            const publishUrl = `/studies/${params.studyId}/analysis/publish/${params.analysisId}`;
            // Set up query parameters
            const queryParams = {};
            if (params.ignoreUndefinedMd5) {
                queryParams.ignoreUndefinedMd5 = true;
            }
            // Make the PUT request to publish
            const response = await this.http.put(publishUrl, null, {
                params: queryParams,
            });
            logger_1.Logger.debug `Analysis published successfully`;
            return {
                analysisId: params.analysisId,
                studyId: params.studyId,
                status: "PUBLISHED",
                message: typeof response.data === "object" &&
                    response.data !== null &&
                    "message" in response.data
                    ? String(response.data.message)
                    : "Successfully published",
            };
        }
        catch (error) {
            this.handleServiceError(error, "analysis publication");
        }
    }
    /**
     * Check if a study exists
     */
    async checkStudyExists(studyId) {
        try {
            await this.http.get(`/studies/${studyId}`);
            return true;
        }
        catch (error) {
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
    isConflictError(error) {
        if (typeof error === "object" && error !== null && "response" in error) {
            const response = error.response;
            return (response === null || response === void 0 ? void 0 : response.status) === 409;
        }
        return false;
    }
    /**
     * Check if error is a 404 not found
     */
    isNotFoundError(error) {
        if (typeof error === "object" && error !== null && "response" in error) {
            const response = error.response;
            return (response === null || response === void 0 ? void 0 : response.status) === 404;
        }
        return false;
    }
}
exports.SongService = SongService;
