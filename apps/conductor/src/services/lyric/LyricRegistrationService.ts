// src/services/lyric/LyricRegistrationService.ts
import { BaseService } from "../base/baseService";
import { ServiceConfig } from "../base/types";
import { Logger } from "../../utils/logger";
import { ErrorFactory } from "../../utils/errors";
import {
  DictionaryRegistrationParams,
  LyricRegistrationResponse,
} from "./types";

export class LyricRegistrationService extends BaseService {
  constructor(config: ServiceConfig) {
    super(config);
  }

  get serviceName(): string {
    return "Lyric";
  }

  protected get healthEndpoint(): string {
    return "/health";
  }

  /**
   * Register a dictionary with the Lyric service
   */
  async registerDictionary(
    params: DictionaryRegistrationParams
  ): Promise<LyricRegistrationResponse> {
    try {
      // Validate required parameters
      this.validateRequired(params, [
        "categoryName",
        "dictionaryName",
        "dictionaryVersion",
        "defaultCentricEntity",
      ]);

      Logger.info`Registering dictionary ${params.dictionaryName} version ${params.dictionaryVersion}`;

      // Prepare form data
      const formData = new URLSearchParams();
      formData.append("categoryName", params.categoryName);
      formData.append("dictionaryName", params.dictionaryName);
      formData.append("dictionaryVersion", params.dictionaryVersion);
      formData.append("defaultCentricEntity", params.defaultCentricEntity);

      const response = await this.http.post<any>(
        "/dictionary/register",
        formData.toString(),
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      );

      // Check for API-level errors in response
      if (response.data?.error) {
        throw ErrorFactory.validation(
          "Dictionary registration failed",
          {
            error: response.data.error,
            params,
            response: response.data,
          },
          [
            `Server error: ${response.data.error}`,
            "Check dictionary parameters and format",
            "Verify the category exists in Lyric",
          ]
        );
      }

      Logger.debug`Dictionary registered successfully`;

      return {
        success: true,
        message: "Dictionary registered successfully",
        ...response.data,
      };
    } catch (error) {
      this.handleServiceError(error, "dictionary registration");
    }
  }

  /**
   * Check if a dictionary is already registered
   */
  async checkDictionaryExists(params: {
    categoryName: string;
    dictionaryName: string;
    dictionaryVersion: string;
  }): Promise<boolean> {
    try {
      // This would need to be implemented based on Lyric's API
      // For now, returning false as a placeholder
      Logger.debug`Checking if dictionary exists: ${params.dictionaryName} v${params.dictionaryVersion}`;
      return false;
    } catch (error) {
      Logger.warnString(`Could not check dictionary existence: ${error}`);
      return false;
    }
  }

  /**
   * Get list of registered dictionaries
   */
  async getDictionaries(): Promise<any[]> {
    try {
      const response = await this.http.get<any>("/dictionaries");
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      this.handleServiceError(error, "get dictionaries");
    }
  }

  /**
   * Get categories available in Lyric
   */
  async getCategories(): Promise<any[]> {
    try {
      const response = await this.http.get<any>("/categories");
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      this.handleServiceError(error, "get categories");
    }
  }
}
