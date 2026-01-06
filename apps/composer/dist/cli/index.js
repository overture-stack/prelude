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
exports.setupCLI = setupCLI;
// src/cli/index.ts - Fixed to handle directories properly
const commander_1 = require("commander");
const commandRegistry_1 = require("../commands/commandRegistry");
const errors_1 = require("../utils/errors");
const validations_1 = require("../validations");
const environment_1 = require("./environment");
const commandOptions_1 = require("./commandOptions");
const profiles_1 = require("../types/profiles");
const logger_1 = require("../utils/logger");
const fileUtils_1 = require("../utils/fileUtils");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
async function setupCLI() {
    const program = new commander_1.Command();
    try {
        const envConfig = (0, environment_1.loadEnvironmentConfig)();
        (0, commandOptions_1.configureCommandOptions)(program);
        // Check if we should show help before parsing (when no profile is specified)
        const argv = process.argv.slice(2);
        const hasProfile = argv.some(arg => Object.values(profiles_1.Profiles).some(profile => profile.toLowerCase() === arg.toLowerCase()));
        const hasPFlag = argv.includes('-p') || argv.some(arg => arg.startsWith('--profile'));
        const hasHelpFlag = argv.includes('-h') || argv.includes('--help');
        // If no profile specified and no help flag, show help
        if (!hasProfile && !hasPFlag && !hasHelpFlag && argv.length > 0) {
            logger_1.Logger.showReferenceCommands();
            process.exit(0);
        }
        // If no arguments at all, show help
        if (argv.length === 0) {
            logger_1.Logger.showReferenceCommands();
            process.exit(0);
        }
        program.parse();
        const options = program.opts();
        const args = program.args;
        // Handle profile from positional argument or -p option
        let profile = options.profile;
        // If positional argument is provided, use it (takes precedence over -p option)
        if (args.length > 0) {
            const positionalProfile = args[0];
            // Find matching profile (case-insensitive)
            const matchingProfile = Object.values(profiles_1.Profiles).find((p) => p.toLowerCase() === positionalProfile.toLowerCase());
            if (matchingProfile) {
                profile = matchingProfile;
            }
            else {
                // If positional argument doesn't match a profile, treat it as invalid
                const suggestions = Array.from(commandOptions_1.PROFILE_DESCRIPTIONS.entries()).map(([profile, desc]) => `  ▸ ${profile}: ${desc}`);
                throw errors_1.ErrorFactory.args(`Invalid profile: ${positionalProfile}`, [
                    "Valid profiles are (case-insensitive):\n",
                    ...suggestions,
                    "\nUsage examples:",
                    "  ▸ composer ArrangerConfigs -f mapping.json",
                    "  ▸ composer -p ArrangerConfigs -f mapping.json",
                ]);
            }
        }
        // Profile should be set by now (either from args or -p option)
        if (!profile) {
            throw errors_1.ErrorFactory.args("No profile specified", [
                "This should not happen - profile validation error",
            ]);
        }
        // Update options with resolved profile
        options.profile = profile;
        if (!commandRegistry_1.CommandRegistry.isRegistered(options.profile)) {
            throw errors_1.ErrorFactory.args(`Invalid profile: ${options.profile}`, [
                "Use --help to see available profiles",
                `Available profiles: ${commandRegistry_1.CommandRegistry.getAvailableProfiles().join(", ")}`,
                "Example: -p SongSchema or -p LecternDictionary",
            ]);
        }
        // FIXED: Expand directories but let commands handle file type validation
        if (options.files) {
            // Get the command config to know what file types are supported
            const commandConfig = commandRegistry_1.CommandRegistry.getConfig(options.profile);
            if (commandConfig) {
                // Separate directories from explicit files
                const directories = [];
                const explicitFiles = [];
                options.files.forEach((pathStr) => {
                    try {
                        if (fs.existsSync(pathStr) && fs.statSync(pathStr).isDirectory()) {
                            directories.push(pathStr);
                        }
                        else {
                            explicitFiles.push(pathStr);
                        }
                    }
                    catch {
                        // If we can't stat it, treat it as an explicit file (let file validation handle the error)
                        explicitFiles.push(pathStr);
                    }
                });
                // Expand directories with file type filtering
                const expandedFiles = directories.length > 0
                    ? (0, fileUtils_1.expandDirectoryPaths)(directories, commandConfig.fileTypes)
                    : [];
                // Combine expanded directory files with explicit files (no filtering on explicit files)
                const allFiles = [...expandedFiles, ...explicitFiles];
                if (allFiles.length === 0) {
                    throw errors_1.ErrorFactory.validation(`No supported files found for ${commandConfig.name}`, {
                        providedPaths: options.files,
                        supportedTypes: commandConfig.fileTypes,
                    }, [
                        `${commandConfig.name} supports: ${commandConfig.fileTypes.join(", ")}`,
                        "Check that your directories contain files with the correct extensions",
                        "Verify the paths are correct and accessible",
                    ]);
                }
                // Replace the original files array with the combined list
                options.files = allFiles;
                // Only validate file extensions for directory-expanded files
                // Let individual commands handle explicit file validation for better error messages
                if (directories.length > 0 && explicitFiles.length === 0) {
                    // Only directories were provided - validate all files
                    const invalidFiles = options.files.filter((file) => {
                        const ext = path.extname(file).toLowerCase();
                        return !commandConfig.fileTypes.includes(ext);
                    });
                    if (invalidFiles.length > 0) {
                        throw errors_1.ErrorFactory.validation(`Invalid file types for ${commandConfig.name}`, {
                            invalidFiles,
                            expectedTypes: commandConfig.fileTypes,
                            providedFiles: options.files,
                        }, [
                            `${commandConfig.name} supports: ${commandConfig.fileTypes.join(", ")}`,
                            "Check your input files and try again",
                            `Invalid files: ${invalidFiles.join(", ")}`,
                        ]);
                    }
                }
            }
        }
        // Use the parseOptions function from commandOptions
        const cliOutput = (0, commandOptions_1.parseOptions)(options);
        cliOutput.envConfig = envConfig;
        // Validate environment
        await (0, validations_1.validateEnvironment)({
            profile: options.profile,
            outputPath: cliOutput.outputPath,
        });
        return cliOutput;
    }
    catch (error) {
        if (error instanceof Error) {
            throw error;
        }
        throw errors_1.ErrorFactory.args("Error setting up CLI", [String(error)]);
    }
}
//# sourceMappingURL=index.js.map