"use strict";
// src/services/postgresql/index.ts
/**
 * PostgreSQL Services Index
 *
 * Exports all PostgreSQL-related functions and types.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendBulkInsertRequest = exports.validateConnection = exports.createPostgresClient = void 0;
var client_1 = require("./client");
Object.defineProperty(exports, "createPostgresClient", { enumerable: true, get: function () { return client_1.createPostgresClient; } });
Object.defineProperty(exports, "validateConnection", { enumerable: true, get: function () { return client_1.validateConnection; } });
var bulk_1 = require("./bulk");
Object.defineProperty(exports, "sendBulkInsertRequest", { enumerable: true, get: function () { return bulk_1.sendBulkInsertRequest; } });
