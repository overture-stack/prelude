export interface LecternSchemaUploadParams {
  schemaContent: string;
  [key: string]: string; // Index signature for validation compatibility
}

export interface LecternUploadResponse {
  id?: string;
  name?: string;
  version?: string;
  error?: string;
  [key: string]: any;
}

export interface LecternDictionary {
  _id: string;
  name: string;
  version: string;
  schemas: LecternSchema[];
}

export interface LecternSchema {
  name: string;
  description?: string;
  fields?: any[];
  meta?: any;
}

export interface DictionaryValidationResult {
  exists: boolean;
  entities: string[];
  dictionary?: LecternDictionary;
}
