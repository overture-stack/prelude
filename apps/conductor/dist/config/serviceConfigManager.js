"use strict";
// src/config/ServiceConfigManager.ts
/**
 * Unified service configuration management
 * Replaces scattered config objects throughout commands and services
 * Updated to use error factory pattern for consistent error handling
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServiceConfigManager = void 0;
const environment_1 = require("./environment");
const errors_1 = require("../utils/errors");
class ServiceConfigManager {
    /**
     * Create Elasticsearch configuration
     */
    static createElasticsearchConfig(overrides = {}) {
        const env = environment_1.Environment.services.elasticsearch;
        const defaults = environment_1.Environment.defaults.elasticsearch;
        return {
            name: "Elasticsearch",
            url: env.url,
            authToken: undefined,
            timeout: environment_1.Environment.defaults.timeouts.default,
            retries: 1,
            retryDelay: 1000,
            user: env.user,
            password: env.password,
            index: defaults.index,
            batchSize: defaults.batchSize,
            delimiter: defaults.delimiter,
            ...overrides,
        };
    }
    /**
     * Create Lectern service configuration
     */
    static createLecternConfig(overrides = {}) {
        const env = environment_1.Environment.services.lectern;
        return {
            name: "Lectern",
            url: env.url,
            authToken: env.authToken,
            timeout: environment_1.Environment.defaults.timeouts.default,
            retries: 1,
            retryDelay: 1000,
            ...overrides,
        };
    }
    /**
     * Create Lyric service configuration
     */
    static createLyricConfig(overrides = {}) {
        const env = environment_1.Environment.services.lyric;
        const defaults = environment_1.Environment.defaults.lyric;
        return {
            name: "Lyric",
            url: env.url,
            authToken: undefined,
            timeout: environment_1.Environment.defaults.timeouts.upload,
            retries: 1,
            retryDelay: defaults.retryDelay,
            categoryId: env.categoryId,
            organization: env.organization,
            maxRetries: defaults.maxRetries,
            ...overrides,
        };
    }
    /**
     * Create SONG service configuration
     */
    static createSongConfig(overrides = {}) {
        const env = environment_1.Environment.services.song;
        return {
            name: "SONG",
            url: env.url,
            authToken: env.authToken,
            timeout: environment_1.Environment.defaults.timeouts.upload,
            retries: 1,
            retryDelay: 1000,
            ...overrides,
        };
    }
    /**
     * Create Score service configuration
     */
    static createScoreConfig(overrides = {}) {
        const env = environment_1.Environment.services.score;
        return {
            name: "Score",
            url: env.url,
            authToken: env.authToken,
            timeout: environment_1.Environment.defaults.timeouts.upload,
            retries: 2,
            retryDelay: 2000,
            ...overrides,
        };
    }
    /**
     * Create Maestro service configuration
     */
    static createMaestroConfig(overrides = {}) {
        const env = environment_1.Environment.services.maestro;
        return {
            name: "Maestro",
            url: env.url,
            authToken: undefined,
            timeout: environment_1.Environment.defaults.timeouts.default,
            retries: 1,
            retryDelay: 1000,
            ...overrides,
        };
    }
    /**
     * Create file service configuration (for commands that handle files)
     */
    static createFileServiceConfig(baseConfig, fileOptions = {}) {
        return {
            ...baseConfig,
            dataDir: fileOptions.dataDir || "./data",
            outputDir: fileOptions.outputDir || "./output",
            manifestFile: fileOptions.manifestFile,
            ...fileOptions,
        };
    }
    /**
     * Validate service configuration
     */
    static validateConfig(config) {
        if (!config.url) {
            throw errors_1.ErrorFactory.args(`Missing URL for ${config.name} service`, [
                "Provide service URL in configuration",
                "Set appropriate environment variable",
                "Use command line option to specify URL",
            ]);
        }
        try {
            new URL(config.url);
        }
        catch (error) {
            throw errors_1.ErrorFactory.validation(`Invalid ${config.name} service URL`, { url: config.url, originalError: error }, [
                "Ensure URL includes protocol (http:// or https://)",
                "Check URL format and spelling",
                "Verify port number if specified",
            ]);
        }
        if (config.timeout && (config.timeout < 1000 || config.timeout > 300000)) {
            throw errors_1.ErrorFactory.validation(`Invalid timeout for ${config.name} service`, { timeout: config.timeout }, [
                "Timeout must be between 1000ms and 300000ms",
                "Recommended range: 5000-30000ms for most services",
            ]);
        }
        if (config.retries && (config.retries < 0 || config.retries > 10)) {
            throw errors_1.ErrorFactory.validation(`Invalid retries value for ${config.name} service`, { retries: config.retries }, ["Retries must be between 0 and 10", "Recommended range: 1-5 retries"]);
        }
    }
    /**
     * Get all configured services status
     */
    static getServicesOverview() {
        const env = environment_1.Environment.services;
        return {
            elasticsearch: {
                url: env.elasticsearch.url,
                configured: !!env.elasticsearch.url,
            },
            lectern: { url: env.lectern.url, configured: !!env.lectern.url },
            lyric: { url: env.lyric.url, configured: !!env.lyric.url },
            song: { url: env.song.url, configured: !!env.song.url },
            score: { url: env.score.url, configured: !!env.score.url },
            maestro: { url: env.maestro.url, configured: !!env.maestro.url },
        };
    }
}
exports.ServiceConfigManager = ServiceConfigManager;
