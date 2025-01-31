"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.inferFieldType = inferFieldType;
exports.generateMapping = generateMapping;
exports.validateAndGetMapping = validateAndGetMapping;
const chalk_1 = __importDefault(require("chalk"));
const csv_1 = require("../utils/csv");
const fs = __importStar(require("fs"));
/**
 * Infers the Elasticsearch field type based on header name and sample value
 */
function inferFieldType(headerName, sampleValue) {
    process.stdout.write(chalk_1.default.cyan(`\nInferring type for field: ${headerName}\n`));
    // Handle empty sample values
    if (!sampleValue || sampleValue.trim() === '') {
        process.stdout.write(chalk_1.default.yellow(`⚠ Empty sample value detected, defaulting to keyword with null value\n`));
        return { type: 'keyword', null_value: 'No Data' };
    }
    // Check for numeric fields
    if (!isNaN(Number(sampleValue))) {
        if (Number.isInteger(Number(sampleValue))) {
            process.stdout.write(chalk_1.default.green(`✓ Detected integer type\n`));
            return { type: 'integer' };
        }
        process.stdout.write(chalk_1.default.green(`✓ Detected float type\n`));
        return { type: 'float' };
    }
    // Check for date fields
    if (headerName.includes('date') ||
        headerName.includes('time') ||
        headerName.includes('timestamp')) {
        process.stdout.write(chalk_1.default.green(`✓ Detected date type\n`));
        return { type: 'date' };
    }
    // Default to keyword
    process.stdout.write(chalk_1.default.green(`✓ Using default keyword type\n`));
    return { type: 'keyword' };
}
/**
 * Generates Elasticsearch mapping from CSV headers and sample data
 */
function generateMapping(csvHeaders, sampleData) {
    process.stdout.write(chalk_1.default.cyan('\nGenerating Elasticsearch mapping...\n'));
    const properties = {};
    csvHeaders.forEach(header => {
        properties[header] = inferFieldType(header, sampleData[header]);
    });
    const mapping = {
        index_patterns: ['tabular-*'],
        aliases: {
            data_centric: {},
        },
        mappings: {
            properties: {
                ...properties,
                submission_metadata: {
                    type: 'object',
                    properties: {
                        submitter_id: {
                            type: 'keyword',
                            null_value: 'No Data',
                        },
                        processing_started: {
                            type: 'date',
                        },
                        processed_at: {
                            type: 'date',
                        },
                        source_file: {
                            type: 'keyword',
                            null_value: 'No Data',
                        },
                        record_number: {
                            type: 'integer',
                        },
                        hostname: {
                            type: 'keyword',
                            null_value: 'No Data',
                        },
                        username: {
                            type: 'keyword',
                            null_value: 'No Data',
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
    process.stdout.write(chalk_1.default.green(`✓ Mapping generated successfully\n`));
    return mapping;
}
/**
 * Validates and extracts mapping information from CSV file
 * @param filePath - Path to the CSV file
 * @param delimiter - CSV delimiter character
 * @returns Promise resolving to Elasticsearch mapping object
 */
async function validateAndGetMapping(filePath, delimiter) {
    // Read first two lines for mapping generation
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const [headerLine, sampleLine] = fileContent.split('\n');
    if (!headerLine || !sampleLine) {
        throw new Error('CSV file must contain at least a header row and one data row');
    }
    const headers = (0, csv_1.parseCSVLine)(headerLine, delimiter, true)[0];
    const sampleValues = (0, csv_1.parseCSVLine)(sampleLine, delimiter, false)[0];
    if (!headers || !sampleValues) {
        throw new Error('Failed to parse CSV headers or sample data');
    }
    // Create sample data object
    const sampleData = {};
    headers.forEach((header, index) => {
        var _a;
        sampleData[header] = ((_a = sampleValues[index]) === null || _a === void 0 ? void 0 : _a.toString()) || '';
    });
    return generateMapping(headers, sampleData);
}
