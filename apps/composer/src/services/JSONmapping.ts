import chalk from "chalk";
import fs from "fs";
import type {
  ElasticsearchMapping,
  ElasticsearchField,
} from "../types/elasticsearch";

/**
 * Infers the Elasticsearch field type based on key name and sample value
 */
export function inferFieldType(
  keyName: string,
  sampleValue: any
): ElasticsearchField {
  process.stdout.write(chalk.cyan(`\nInferring type for field: ${keyName}\n`));

  // Handle empty sample values
  if (sampleValue === null || sampleValue === undefined || sampleValue === "") {
    process.stdout.write(
      chalk.yellow(
        `⚠ Empty sample value detected, defaulting to keyword with null value\n`
      )
    );
    return { type: "keyword", null_value: "No Data" };
  }

  // Check for numeric fields
  if (typeof sampleValue === "number") {
    if (Number.isInteger(sampleValue)) {
      process.stdout.write(chalk.green(`✓ Detected integer type\n`));
      return { type: "integer" };
    }
    process.stdout.write(chalk.green(`✓ Detected float type\n`));
    return { type: "float" };
  }

  // Check for boolean fields
  if (typeof sampleValue === "boolean") {
    process.stdout.write(chalk.green(`✓ Detected boolean type\n`));
    return { type: "boolean" };
  }

  // Check for date fields based on key name
  if (
    keyName.toLowerCase().includes("date") ||
    keyName.toLowerCase().includes("timestamp")
  ) {
    process.stdout.write(chalk.green(`✓ Detected date type\n`));
    return { type: "date" };
  }

  // Default to keyword for strings
  process.stdout.write(chalk.green(`✓ Using default keyword type\n`));
  return { type: "keyword" };
}

/**
 * Generates Elasticsearch mapping from a JSON file
 */
export function generateMappingFromJson(
  jsonFilePath: string
): ElasticsearchMapping {
  process.stdout.write(
    chalk.cyan("\nGenerating Elasticsearch mapping from JSON...\n")
  );

  const jsonData = JSON.parse(fs.readFileSync(jsonFilePath, "utf8"));

  if (!Array.isArray(jsonData) || jsonData.length === 0) {
    throw new Error("Invalid JSON: Expected an array of objects.");
  }

  const sampleRecord = jsonData[0]; // Use the first record as a sample
  const properties: Record<string, ElasticsearchField> = {};

  Object.keys(sampleRecord).forEach((key) => {
    properties[key] = inferFieldType(key, sampleRecord[key]);
  });

  const mapping: ElasticsearchMapping = {
    index_patterns: ["json-data-*"],
    aliases: {
      data_centric: {},
    },
    mappings: {
      properties: {
        data: {
          type: "object",
          properties: {
            ...properties,
            submission_metadata: {
              type: "object",
              properties: {
                submitter_id: { type: "keyword", null_value: "No Data" },
                processing_started: { type: "date" },
                processed_at: { type: "date" },
                source_file: { type: "keyword", null_value: "No Data" },
                record_number: { type: "integer" },
                hostname: { type: "keyword", null_value: "No Data" },
                username: { type: "keyword", null_value: "No Data" },
              },
            },
          },
        },
      },
    },
    settings: {
      number_of_shards: 1,
      number_of_replicas: 0,
    },
  };

  process.stdout.write(chalk.green(`✓ Mapping generated successfully\n`));
  return mapping;
}
