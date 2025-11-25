import type { LecternDictionary, LecternSchema } from "../types";
/**
 * Creates a base Lectern dictionary structure
 * Initializes an empty dictionary with metadata
 *
 * @example
 * generateDictionary(
 *   "My Dictionary",
 *   "Sample data dictionary",
 *   "1.0.0"
 * ) → {
 *   name: "My Dictionary",
 *   description: "Sample data dictionary",
 *   version: "1.0.0",
 *   schemas: [],
 *   meta: {}
 * }
 */
export declare function generateDictionary(dictionaryName: string, description: string, version: string): LecternDictionary;
/**
 * Generates a Lectern schema from CSV headers and sample data
 * Creates field definitions with inferred types and metadata
 * Uses the input file name as the schema name
 *
 * Process:
 * 1. Maps each CSV header to a field definition
 * 2. Infers value types from sample data
 * 3. Adds metadata and descriptions
 * 4. Assembles complete schema
 *
 * @example
 * generateSchema(
 *   "patient_data.csv",
 *   ["name", "age", "is_active"],
 *   { name: "John", age: "30", is_active: "true" }
 * ) → {
 *   name: "patient_data",
 *   description: "Schema generated from patient_data.csv",
 *   fields: [
 *     { name: "name", valueType: "string", ... },
 *     { name: "age", valueType: "integer", ... },
 *     { name: "is_active", valueType: "boolean", ... }
 *   ],
 *   meta: { createdAt: "...", filename: "patient_data.csv" }
 * }
 */
export declare function generateSchema(inputFilePath: string, csvHeaders: string[], sampleData: Record<string, string>): LecternSchema;
//# sourceMappingURL=generateLecternDictionary.d.ts.map