"use strict";
/**
 * Elasticsearch Service
 *
 * Main entry point for Elasticsearch functionality.
 * Re-exports functions from specialized modules.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendBulkWriteRequest = exports.validateConnection = exports.createClientFromConfig = void 0;
// Re-export client functionality
var client_1 = require("./client");
Object.defineProperty(exports, "createClientFromConfig", { enumerable: true, get: function () { return client_1.createClientFromConfig; } });
Object.defineProperty(exports, "validateConnection", { enumerable: true, get: function () { return client_1.validateConnection; } });
// Re-export bulk operations
var bulk_1 = require("./bulk");
Object.defineProperty(exports, "sendBulkWriteRequest", { enumerable: true, get: function () { return bulk_1.sendBulkWriteRequest; } });
