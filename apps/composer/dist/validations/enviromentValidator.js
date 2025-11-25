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
exports.validateEnvironment = validateEnvironment;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const errors_1 = require("../utils/errors"); // UPDATED: Import ErrorFactory
const logger_1 = require("../utils/logger");
// Keep track of validation state to prevent duplicate validations
let environmentValidated = false;
/**
 * Determines which directories are required based on the selected profile.
 */
function getRequiredDirectories(config) {
    const { profile, outputPath } = config;
    const directories = [];
    if (outputPath) {
        const outputDir = path.dirname(outputPath);
        if (outputDir !== ".") {
            directories.push(outputDir);
        }
    }
    return [...new Set(directories)].map((dir) => path.normalize(dir));
}
/**
 * Validates the environment configuration and creates any missing directories.
 */
async function validateEnvironment(config) {
    // Skip if already validated
    if (environmentValidated) {
        logger_1.Logger.debug `Environment already validated, skipping check`;
        return true;
    }
    logger_1.Logger.debugObject("Environment configuration", config);
    // Get and create required directories
    const directories = getRequiredDirectories(config);
    for (const dir of directories) {
        if (dir && !fs.existsSync(dir)) {
            try {
                fs.mkdirSync(dir, { recursive: true });
                logger_1.Logger.info `Created directory: ${dir}`;
            }
            catch (error) {
                // UPDATED: Use ErrorFactory with helpful suggestions
                throw errors_1.ErrorFactory.environment(`Failed to create directory ${dir}`, error, [
                    "Check that you have write permissions to the parent directory",
                    "Ensure the path is not too long for your filesystem",
                    "Verify there are no special characters in the path",
                    "Make sure the disk has sufficient space",
                ]);
            }
        }
    }
    environmentValidated = true;
    return true;
}
//# sourceMappingURL=enviromentValidator.js.map