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
exports.validateFile = validateFile;
exports.validateElasticsearchConnection = validateElasticsearchConnection;
exports.validateCSVStructure = validateCSVStructure;
exports.validateBatchSize = validateBatchSize;
exports.validateIndex = validateIndex;
exports.validateDelimiter = validateDelimiter;
const chalk_1 = __importDefault(require("chalk"));
const fs = __importStar(require("fs"));
async function validateFile(filePath) {
    try {
        // Check if file exists
        if (!fs.existsSync(filePath)) {
            process.stdout.write(chalk_1.default.red(`\n❌ Error: File '${filePath}' does not exist\n`));
            return false;
        }
        // Check if file is readable
        try {
            fs.accessSync(filePath, fs.constants.R_OK);
        }
        catch (error) {
            process.stdout.write(chalk_1.default.red(`\n❌ Error: File '${filePath}' is not readable\n`));
            return false;
        }
        // Check if file is empty
        const stats = fs.statSync(filePath);
        if (stats.size === 0) {
            process.stdout.write(chalk_1.default.red(`\n❌ Error: File '${filePath}' is empty\n`));
            return false;
        }
        return true;
    }
    catch (error) {
        process.stdout.write(chalk_1.default.red(`\n❌ Error validating file: ${error}\n`));
        return false;
    }
}
async function validateElasticsearchConnection(client, config) {
    try {
        // Test connection to Elasticsearch
        const { body: health } = await client.cluster.health();
        process.stdout.write(chalk_1.default.green(`✓ Connected to Elasticsearch cluster: ${health.cluster_name}\n`));
        process.stdout.write(chalk_1.default.green(`✓ Cluster status: ${health.status}\n`));
        return true;
    }
    catch (error) { // Type as any for error handling
        process.stdout.write(chalk_1.default.red('\n❌ Error connecting to Elasticsearch:\n'));
        if ((error === null || error === void 0 ? void 0 : error.name) === 'ConnectionError') {
            process.stdout.write(chalk_1.default.yellow('Could not connect to Elasticsearch. Please check:\n'));
            process.stdout.write('1. Elasticsearch is running\n');
            process.stdout.write(`2. The URL is correct: ${config.elasticsearch.url}\n`);
            process.stdout.write('3. Network connectivity\n');
        }
        else if ((error === null || error === void 0 ? void 0 : error.name) === 'AuthenticationException') {
            process.stdout.write(chalk_1.default.yellow('Authentication failed. Please check:\n'));
            process.stdout.write('1. Username is correct\n');
            process.stdout.write('2. Password is correct\n');
            process.stdout.write('3. User has sufficient permissions\n');
        }
        else {
            process.stdout.write(chalk_1.default.yellow('Error details:\n'));
            console.error(error);
        }
        return false;
    }
}
async function validateCSVStructure(headers) {
    // Check if we have at least one header
    if (!headers || headers.length === 0) {
        process.stdout.write(chalk_1.default.red('\n❌ Error: No headers found in CSV file\n'));
        return false;
    }
    // Check for duplicate headers
    const uniqueHeaders = new Set(headers);
    if (uniqueHeaders.size !== headers.length) {
        process.stdout.write(chalk_1.default.red('\n❌ Error: Duplicate headers found in CSV file\n'));
        const duplicates = headers.filter((header, index) => headers.indexOf(header) !== index);
        process.stdout.write(chalk_1.default.yellow('Duplicate headers:\n'));
        duplicates.forEach(header => {
            process.stdout.write(`├─ ${header}\n`);
        });
        return false;
    }
    // Check for empty or whitespace-only headers
    const invalidHeaders = headers.filter(header => !header || header.trim() === '');
    if (invalidHeaders.length > 0) {
        process.stdout.write(chalk_1.default.red('\n❌ Error: Invalid headers found in CSV file\n'));
        process.stdout.write(chalk_1.default.yellow('Empty or whitespace-only headers found at positions:\n'));
        invalidHeaders.forEach((_, index) => {
            process.stdout.write(`├─ Column ${index + 1}\n`);
        });
        return false;
    }
    return true;
}
function validateBatchSize(batchSize) {
    if (isNaN(batchSize) || batchSize < 1) {
        process.stdout.write(chalk_1.default.red('\n❌ Error: Invalid batch size\n'));
        process.stdout.write(chalk_1.default.yellow('Batch size must be a positive number\n'));
        return false;
    }
    if (batchSize > 10000) {
        process.stdout.write(chalk_1.default.yellow('\n⚠️  Warning: Large batch size detected\n'));
        process.stdout.write('Large batch sizes may cause memory issues or timeouts\n');
        process.stdout.write('Recommended batch size is between 500 and 5000\n');
    }
    return true;
}
async function validateIndex(client, indexName) {
    try {
        // Check if index exists
        const exists = await client.indices.exists({ index: indexName });
        if (!exists.body) {
            // Get list of available indices
            const { body } = await client.cat.indices({ format: 'json', v: true });
            process.stdout.write(chalk_1.default.red(`\n❌ Error: Index '${indexName}' does not exist\n\n`));
            process.stdout.write(chalk_1.default.yellow('Available indices:\n'));
            // Filter and sort indices
            const filteredIndices = body
                .filter((idx) => {
                const name = idx.index;
                return !name.startsWith('.') && // Remove system indices
                    !name.endsWith('_arranger_set'); // Remove arranger sets
            })
                .sort((a, b) => a.index.localeCompare(b.index));
            filteredIndices.forEach((idx) => {
                process.stdout.write(chalk_1.default.cyan(`├─ ${idx.index}\n`));
            });
            return false;
        }
        // Get index settings and mappings for additional validation if needed
        const { body: settings } = await client.indices.get({
            index: indexName,
            include_type_name: false
        });
        // Log index details
        process.stdout.write(chalk_1.default.green(`✓ Index '${indexName}' exists and is valid\n`));
        return true;
    }
    catch (error) {
        process.stdout.write(chalk_1.default.red(`\n❌ Error validating index: ${error}\n`));
        return false;
    }
}
function validateDelimiter(delimiter) {
    if (!delimiter || delimiter.length !== 1) {
        process.stdout.write(chalk_1.default.red('\n❌ Error: Invalid delimiter\n'));
        process.stdout.write(chalk_1.default.yellow('Delimiter must be a single character\n'));
        return false;
    }
    return true;
}
