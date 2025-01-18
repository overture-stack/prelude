"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatDuration = formatDuration;
exports.calculateETA = calculateETA;
exports.createProgressBar = createProgressBar;
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
        return 'Invalid duration';
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
}
function calculateETA(processed, total, elapsedSeconds) {
    // Validate inputs
    if (!isFinite(processed) || !isFinite(total) || !isFinite(elapsedSeconds)) {
        return 'Invalid calculation';
    }
    if (processed <= 0 || total <= 0 || elapsedSeconds <= 0) {
        return 'Calculating...';
    }
    try {
        const recordsPerSecond = processed / elapsedSeconds;
        const remainingRecords = total - processed;
        const remainingSeconds = remainingRecords / recordsPerSecond;
        if (!isFinite(remainingSeconds) || remainingSeconds < 0) {
            return 'Calculating...';
        }
        return formatDuration(remainingSeconds * 1000);
    }
    catch (error) {
        return 'ETA calculation error';
    }
}
function createProgressBar(progress, width = 30) {
    try {
        // Validate and normalize inputs
        if (!isFinite(progress) || !isFinite(width)) {
            return chalk_1.default.yellow('[Invalid progress value]');
        }
        // Clamp progress between 0 and 100
        const normalizedProgress = Math.max(0, Math.min(100, progress || 0));
        // Ensure width is reasonable
        const normalizedWidth = Math.max(10, Math.min(100, width));
        // Calculate bar segments
        const filledWidth = Math.round(normalizedWidth * (normalizedProgress / 100));
        const emptyWidth = normalizedWidth - filledWidth;
        // Create bar segments with boundary checks
        const filledBar = '█'.repeat(Math.max(0, filledWidth));
        const emptyBar = '░'.repeat(Math.max(0, emptyWidth));
        // Return formatted progress bar
        return `${chalk_1.default.green(filledBar)}${chalk_1.default.gray(emptyBar)} ${normalizedProgress.toFixed(1)}%`;
    }
    catch (error) {
        return chalk_1.default.yellow('[Progress calculation error]');
    }
}
