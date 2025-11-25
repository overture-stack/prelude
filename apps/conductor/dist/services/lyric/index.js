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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LyricSubmissionService = exports.LyricRegistrationService = void 0;
// src/services/lyric/index.ts
var LyricRegistrationService_1 = require("./LyricRegistrationService");
Object.defineProperty(exports, "LyricRegistrationService", { enumerable: true, get: function () { return LyricRegistrationService_1.LyricRegistrationService; } });
var LyricSubmissionService_1 = require("./LyricSubmissionService");
Object.defineProperty(exports, "LyricSubmissionService", { enumerable: true, get: function () { return LyricSubmissionService_1.LyricSubmissionService; } });
__exportStar(require("./types"), exports);
