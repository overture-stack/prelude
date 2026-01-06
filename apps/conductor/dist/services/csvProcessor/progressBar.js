"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createProgressBar = exports.calculateETA = exports.formatDuration = void 0;
const chalk_1 = __importDefault(require("chalk"));
/**
 * Utility functions for progress tracking, duration formatting,
 * user interaction, and unique ID generation.
 *
 * This module provides helper functions to:
 * - Format time durations
 * - Calculate estimated time to completion (ETA)
 * - Create visual progress bars
 * - Generate unique submission identifiers
 * - Prompt users for confirmation
 */
function formatDuration(ms) {
    if (!isFinite(ms) || ms < 0)
        return chalk_1.default.red("Invalid duration");
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    return chalk_1.default.magenta(`${hours}h ${minutes % 60}m ${seconds % 60}s`);
}
exports.formatDuration = formatDuration;
function calculateETA(processed, total, elapsedSeconds) {
    // Validate inputs
    if (!isFinite(processed) || !isFinite(total) || !isFinite(elapsedSeconds)) {
        return chalk_1.default.yellow("Invalid calculation");
    }
    if (processed <= 0 || total <= 0 || elapsedSeconds <= 0) {
        return chalk_1.default.cyan("Calculating...");
    }
    try {
        const recordsPerSecond = processed / elapsedSeconds;
        const remainingRecords = total - processed;
        const remainingSeconds = remainingRecords / recordsPerSecond;
        if (!isFinite(remainingSeconds) || remainingSeconds < 0) {
            return chalk_1.default.cyan("Calculating...");
        }
        return formatDuration(remainingSeconds * 1000);
    }
    catch (error) {
        return chalk_1.default.red("ETA calculation error");
    }
}
exports.calculateETA = calculateETA;
function createProgressBar(progress, widthOrColor = 30) {
    try {
        // Determine if second parameter is width or color
        let width = 30;
        let color = 'green';
        if (typeof widthOrColor === 'number') {
            width = widthOrColor;
        }
        else if (typeof widthOrColor === 'string') {
            color = widthOrColor;
        }
        // Validate and normalize inputs
        if (!isFinite(progress)) {
            return chalk_1.default.yellow("[Invalid progress value]");
        }
        // Clamp progress between 0 and 100
        const normalizedProgress = Math.max(0, Math.min(100, progress || 0));
        // Ensure width is reasonable
        const normalizedWidth = Math.max(10, Math.min(100, width));
        // Calculate bar segments
        const filledWidth = Math.round(normalizedWidth * (normalizedProgress / 100));
        const emptyWidth = normalizedWidth - filledWidth;
        // Select color function
        const colorFn = color === 'blue' ? chalk_1.default.cyan : chalk_1.default.green;
        // Create bar segments with boundary checks
        const filledBar = colorFn("█").repeat(Math.max(0, filledWidth));
        const emptyBar = chalk_1.default.gray("░").repeat(Math.max(0, emptyWidth));
        // Return formatted progress bar
        return `${filledBar}${emptyBar} ${colorFn(normalizedProgress.toFixed(1) + "%")}`;
    }
    catch (error) {
        return chalk_1.default.yellow("[Progress calculation error]");
    }
}
exports.createProgressBar = createProgressBar;
