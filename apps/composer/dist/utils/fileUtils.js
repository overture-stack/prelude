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
Object.defineProperty(exports, "__esModule", { value: true });
exports.expandDirectoryPaths = expandDirectoryPaths;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const logger_1 = require("./logger");
const errors_1 = require("./errors"); // UPDATED: Import ErrorFactory
/**
 * Expands directory paths to individual file paths, filtering by extension if specified
 * @param paths Array of file or directory paths
 * @param extensions Optional array of extensions to filter by (e.g., ['.csv', '.json'])
 * @returns Array of expanded file paths
 */
function expandDirectoryPaths(paths, extensions) {
    if (!paths || paths.length === 0) {
        return [];
    }
    let expandedPaths = [];
    paths.forEach((inputPath) => {
        try {
            const stats = fs.statSync(inputPath);
            if (stats.isDirectory()) {
                logger_1.Logger.debug `Processing directory: ${inputPath}`;
                // Read all files in the directory
                const filesInDir = fs
                    .readdirSync(inputPath)
                    .map((file) => path.join(inputPath, file))
                    .filter((file) => {
                    try {
                        const fileStat = fs.statSync(file);
                        // Skip if not a file
                        if (!fileStat.isFile()) {
                            return false;
                        }
                        // Filter by extension if specified
                        if (extensions && extensions.length > 0) {
                            const ext = path.extname(file).toLowerCase();
                            return extensions.includes(ext);
                        }
                        return true;
                    }
                    catch (error) {
                        logger_1.Logger.debug `Error accessing file ${file}: ${error}`;
                        return false;
                    }
                });
                if (filesInDir.length === 0) {
                    if (extensions && extensions.length > 0) {
                        logger_1.Logger.warn `No files with extensions ${extensions.join(", ")} found in directory: ${inputPath}`;
                    }
                    else {
                        logger_1.Logger.warn `Directory is empty: ${inputPath}`;
                    }
                }
                else {
                    logger_1.Logger.debug `Found ${filesInDir.length} files in directory ${inputPath}`;
                    expandedPaths = [...expandedPaths, ...filesInDir];
                }
            }
            else {
                // It's a file, check extension if needed
                if (extensions && extensions.length > 0) {
                    const ext = path.extname(inputPath).toLowerCase();
                    if (extensions.includes(ext)) {
                        expandedPaths.push(inputPath);
                    }
                    else {
                        logger_1.Logger.debug `Skipping file with unsupported extension: ${inputPath}`;
                    }
                }
                else {
                    expandedPaths.push(inputPath);
                }
            }
        }
        catch (error) {
            logger_1.Logger.debug `Error accessing path ${inputPath}: ${error}`;
            // UPDATED: Use ErrorFactory with helpful suggestions
            throw errors_1.ErrorFactory.file(`Cannot access path: ${inputPath}`, inputPath, [
                "Check that the path exists and is accessible",
                "Verify file permissions allow reading",
            ]);
        }
    });
    return expandedPaths;
}
//# sourceMappingURL=fileUtils.js.map