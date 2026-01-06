import chalk from "chalk";

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

export function formatDuration(ms: number): string {
  if (!isFinite(ms) || ms < 0) return chalk.red("Invalid duration");

  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  return chalk.magenta(`${hours}h ${minutes % 60}m ${seconds % 60}s`);
}

export function calculateETA(
  processed: number,
  total: number,
  elapsedSeconds: number
): string {
  // Validate inputs
  if (!isFinite(processed) || !isFinite(total) || !isFinite(elapsedSeconds)) {
    return chalk.yellow("Invalid calculation");
  }

  if (processed <= 0 || total <= 0 || elapsedSeconds <= 0) {
    return chalk.cyan("Calculating...");
  }

  try {
    const recordsPerSecond = processed / elapsedSeconds;
    const remainingRecords = total - processed;
    const remainingSeconds = remainingRecords / recordsPerSecond;

    if (!isFinite(remainingSeconds) || remainingSeconds < 0) {
      return chalk.cyan("Calculating...");
    }

    return formatDuration(remainingSeconds * 1000);
  } catch (error) {
    return chalk.red("ETA calculation error");
  }
}

export function createProgressBar(
  progress: number,
  widthOrColor: number | string = 30
): string {
  try {
    // Determine if second parameter is width or color
    let width = 30;
    let color = 'green';

    if (typeof widthOrColor === 'number') {
      width = widthOrColor;
    } else if (typeof widthOrColor === 'string') {
      color = widthOrColor;
    }

    // Validate and normalize inputs
    if (!isFinite(progress)) {
      return chalk.yellow("[Invalid progress value]");
    }

    // Clamp progress between 0 and 100
    const normalizedProgress = Math.max(0, Math.min(100, progress || 0));
    // Ensure width is reasonable
    const normalizedWidth = Math.max(10, Math.min(100, width));

    // Calculate bar segments
    const filledWidth = Math.round(
      normalizedWidth * (normalizedProgress / 100)
    );
    const emptyWidth = normalizedWidth - filledWidth;

    // Select color function
    const colorFn = color === 'blue' ? chalk.cyan : chalk.green;

    // Create bar segments with boundary checks
    const filledBar = colorFn("█").repeat(Math.max(0, filledWidth));
    const emptyBar = chalk.gray("░").repeat(Math.max(0, emptyWidth));

    // Return formatted progress bar
    return `${filledBar}${emptyBar} ${colorFn(
      normalizedProgress.toFixed(1) + "%"
    )}`;
  } catch (error) {
    return chalk.yellow("[Progress calculation error]");
  }
}
