import chalk from "chalk";
import type {
  ElasticsearchMapping,
  ElasticsearchField,
} from "../types/elasticsearch";

/**
 * Infers the Elasticsearch field type based on header name and sample value
 */
export function inferFieldType(
  headerName: string,
  sampleValue: string
): ElasticsearchField {
  process.stdout.write(
    chalk.cyan(`\nInferring type for field: ${headerName}\n`)
  );

  // Handle empty sample values
  if (!sampleValue || sampleValue.trim() === "") {
    process.stdout.write(
      chalk.yellow(
        `⚠ Empty sample value detected, defaulting to keyword with null value\n`
      )
    );
    return { type: "keyword", null_value: "No Data" };
  }

  // Check for numeric fields
  if (!isNaN(Number(sampleValue))) {
    if (Number.isInteger(Number(sampleValue))) {
      process.stdout.write(chalk.green(`✓ Detected integer type\n`));
      return { type: "integer" };
    }
    process.stdout.write(chalk.green(`✓ Detected float type\n`));
    return { type: "float" };
  }

  // Check for date fields
  if (
    headerName.includes("date") ||
    headerName.includes("time") ||
    headerName.includes("timestamp")
  ) {
    process.stdout.write(chalk.green(`✓ Detected date type\n`));
    return { type: "date" };
  }

  // Check for boolean fields
  const lowerValue = sampleValue.toLowerCase();
  if (
    lowerValue === "true" ||
    lowerValue === "false" ||
    lowerValue === "yes" ||
    lowerValue === "no" ||
    lowerValue === "0" ||
    lowerValue === "1"
  ) {
    process.stdout.write(chalk.green(`✓ Detected boolean type\n`));
    return { type: "boolean" };
  }

  // Default to keyword
  process.stdout.write(chalk.green(`✓ Using default keyword type\n`));
  return { type: "keyword" };
}

/**
 * Generates Elasticsearch mapping from CSV headers and sample data
 */
export function generateMappingFromCSV(
  csvHeaders: string[],
  sampleData: Record<string, string>
): ElasticsearchMapping {
  process.stdout.write(chalk.cyan("\nGenerating Elasticsearch mapping...\n"));

  const properties: Record<string, ElasticsearchField> = {};

  csvHeaders.forEach((header) => {
    properties[header] = inferFieldType(header, sampleData[header]);
  });

  const mapping: ElasticsearchMapping = {
    index_patterns: ["tabular-*"],
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
                submitter_id: {
                  type: "keyword",
                  null_value: "No Data",
                },
                processing_started: {
                  type: "date",
                },
                processed_at: {
                  type: "date",
                },
                source_file: {
                  type: "keyword",
                  null_value: "No Data",
                },
                record_number: {
                  type: "integer",
                },
                hostname: {
                  type: "keyword",
                  null_value: "No Data",
                },
                username: {
                  type: "keyword",
                  null_value: "No Data",
                },
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
