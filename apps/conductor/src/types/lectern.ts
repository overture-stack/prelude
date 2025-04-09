/**
 * Response from Lectern schema upload
 */
export interface LecternUploadResponse {
  /** The unique identifier for the uploaded schema */
  id?: string;

  /** The name of the schema */
  name?: string;

  /** The version of the schema */
  version?: string;

  /** Any error message returned by Lectern */
  error?: string;

  /** Additional response details */
  [key: string]: any;
}
