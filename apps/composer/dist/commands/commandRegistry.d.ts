import { Command } from "./baseCommand";
import { Profile } from "../types";
interface CommandConfig {
    name: string;
    description: string;
    fileTypes: string[];
    createCommand: () => Command;
}
/**
 * Simplified command registry with Lectern dictionary support for mapping generation
 */
export declare class CommandRegistry {
    private static readonly commands;
    /**
     * Create a command instance by profile
     */
    static createCommand(profile: Profile): Command;
    /**
     * Create and execute a command in one step
     */
    static execute(profile: Profile, cliOutput: any): Promise<void>;
    /**
     * Check if a profile is supported
     */
    static isRegistered(profile: Profile): boolean;
    /**
     * Get all available profiles
     */
    static getAvailableProfiles(): Profile[];
    /**
     * Get command configuration by profile
     */
    static getConfig(profile: Profile): CommandConfig | undefined;
    /**
     * Validate file types for a given profile
     * Note: For ElasticsearchMapping, Lectern dictionaries are validated by content, not just extension
     */
    static validateFileTypes(profile: Profile, filePaths: string[]): {
        valid: boolean;
        invalidFiles: string[];
        supportedTypes: string[];
    };
}
export {};
//# sourceMappingURL=commandRegistry.d.ts.map