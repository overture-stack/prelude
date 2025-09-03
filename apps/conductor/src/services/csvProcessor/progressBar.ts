// src/services/csvProcessor/progressBar.ts
import chalk from "chalk";

/**
 * Utility functions for progress tracking, duration formatting,
 * user interaction, and unique ID generation.
 *
 * This module provides helper functions to:
 * - Format time durations
 * - Calculate estimated time to completion (ETA)
 * - Create visual progress bars
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
  } catch {
    return chalk.red("ETA calculation error");
  }
}

/**
 * Create a progress bar with configurable color (default = green).
 *
 * @param progress - percentage 0–100
 * @param width - number of blocks (default 30)
 * @param color - chalk color for filled bar and percent (default "green")
 */
export function createProgressBar(
  progress: number,
  width: number = 30,
  color: "green" | "cyan" | "yellow" | "magenta" = "green"
): string {
  try {
    if (!isFinite(progress) || !isFinite(width)) {
      return chalk.yellow("[Invalid progress value]");
    }

    const normalizedProgress = Math.max(0, Math.min(100, progress || 0));
    const normalizedWidth = Math.max(10, Math.min(100, width));

    const filledWidth = Math.round(
      normalizedWidth * (normalizedProgress / 100)
    );
    const emptyWidth = normalizedWidth - filledWidth;

    // Pick the requested chalk color, fallback to green
    const colorFn = (chalk as any)[color] || chalk.green;

    const filledBar = colorFn("█").repeat(Math.max(0, filledWidth));
    const emptyBar = chalk.gray("░").repeat(Math.max(0, emptyWidth));

    return `${filledBar}${emptyBar} ${colorFn(
      normalizedProgress.toFixed(1) + "%"
    )}`;
  } catch {
    return chalk.yellow("[Progress calculation error]");
  }
}
