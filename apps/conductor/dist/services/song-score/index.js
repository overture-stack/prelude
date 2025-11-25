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
exports.SongScoreService = exports.SongService = void 0;
// src/services/song/index.ts
var songService_1 = require("./songService");
Object.defineProperty(exports, "SongService", { enumerable: true, get: function () { return songService_1.SongService; } });
var songScoreService_1 = require("./songScoreService");
Object.defineProperty(exports, "SongScoreService", { enumerable: true, get: function () { return songScoreService_1.SongScoreService; } });
__exportStar(require("./types"), exports);
// Note: validateSongSchema is only used internally by SongService
// ScoreService moved to separate module
