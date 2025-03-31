import axios from "axios";
import { Logger } from "../../../utils/logger";
import { ConductorError, ErrorCodes } from "../../../utils/errors";
import { LecternSchemaInfo } from "../interfaces/lectern-schema.interface";

/**
 * Service for managing Lectern schemas
 */
export class LecternSchemasService {
  /**
   * Fetches available schemas from Lectern
   * @param lecternUrl Base URL for Lectern service
   * @returns Array of schema information
   */
  static async fetchSchemas(lecternUrl: string): Promise<LecternSchemaInfo[]> {
    try {
      // 1. First get the list of dictionaries
      const dictUrl = `${lecternUrl.replace(/\/$/, "")}/dictionaries`;
      Logger.debug(`Fetching dictionaries from: ${dictUrl}`);

      const dictResponse = await axios.get(dictUrl, {
        headers: { accept: "application/json" },
        timeout: 10000,
      });

      if (!Array.isArray(dictResponse.data) || dictResponse.data.length === 0) {
        throw new ConductorError(
          "No dictionaries found in Lectern",
          ErrorCodes.CONNECTION_ERROR,
          { response: dictResponse.data }
        );
      }

      // Use the first dictionary (or could be configurable in the future)
      const dictionary = dictResponse.data[0];
      const dictionaryId = dictionary._id;

      Logger.debug(`Using dictionary: ${dictionary.name} (${dictionaryId})`);

      // 2. Get schemas for the selected dictionary
      const schemaUrl = `${lecternUrl.replace(
        /\/$/,
        ""
      )}/dictionaries/${dictionaryId}`;
      Logger.debug(`Fetching schemas from: ${schemaUrl}`);

      const schemaResponse = await axios.get(schemaUrl, {
        headers: { accept: "application/json" },
        timeout: 10000,
      });

      const schemaData = schemaResponse.data as {
        name?: string;
        schemas?: LecternSchemaInfo[];
      };

      if (
        !schemaData.schemas ||
        !Array.isArray(schemaData.schemas) ||
        schemaData.schemas.length === 0
      ) {
        throw new ConductorError(
          "No schemas found in the selected dictionary",
          ErrorCodes.CONNECTION_ERROR,
          { dictionaryName: dictionary.name, dictionaryId }
        );
      }

      return schemaData.schemas;
    } catch (error) {
      if (error instanceof ConductorError) {
        throw error;
      }

      if (this.isAxiosError(error)) {
        const axiosError = error as any;
        throw new ConductorError(
          `Failed to fetch schemas from Lectern: ${
            axiosError.response?.status || ""
          } ${axiosError.message}`,
          ErrorCodes.CONNECTION_ERROR,
          {
            status: axiosError.response?.status,
            statusText: axiosError.response?.statusText,
            data: axiosError.response?.data,
            suggestion:
              "Check your Lectern URL and ensure the service is running.",
          }
        );
      }

      throw new ConductorError(
        `Failed to fetch schemas from Lectern: ${
          error instanceof Error ? error.message : String(error)
        }`,
        ErrorCodes.CONNECTION_ERROR,
        {
          error: error instanceof Error ? error.stack : String(error),
          suggestion:
            "Check your network connection and Lectern server status.",
        }
      );
    }
  }

  /**
   * Type guard to check if an error is an Axios error
   */
  private static isAxiosError(error: any): boolean {
    return Boolean(
      error &&
        typeof error === "object" &&
        "isAxiosError" in error &&
        error.isAxiosError === true
    );
  }
}
