import chalk from "chalk";

/**
 * Progress display utilities: duration formatting, ETA, progress bar rendering,
 * and the shared in-place progress line writer used by both CSV processors.
 *
 * TTY layout (3 lines, cursor-controlled):
 *   └─ [bar] X% | processed/total | ⏱ elapsed | 🏁 eta | ⚡ rows/sec
 *   └─ indexed X records
 *   └─ found Y duplicate records
 *
 * Non-TTY layout (single line, printed once per 1% increment):
 *   └─ [bar] X% | ... | 📦 X indexed | ⏭ Y skipped
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

export function createProgressBar(
  progress: number,
  color: "blue" | "green" = "green"
): string {
  try {
    if (!isFinite(progress)) {
      return chalk.yellow("[Invalid progress value]");
    }

    const normalizedProgress = Math.max(0, Math.min(100, progress || 0));
    const filledWidth = Math.round(30 * (normalizedProgress / 100));
    const emptyWidth = 30 - filledWidth;

    const colorFn = color === "blue" ? chalk.cyan : chalk.green;

    const filledBar = colorFn("█").repeat(Math.max(0, filledWidth));
    const emptyBar = chalk.gray("░").repeat(Math.max(0, emptyWidth));

    return `${filledBar}${emptyBar} ${colorFn(
      normalizedProgress.toFixed(1) + "%"
    )}`;
  } catch {
    return chalk.yellow("[Progress calculation error]");
  }
}

// ─── Shared pipeline stats ─────────────────────────────────────────────────
// Set by the pipeline command after each ES batch so the progress display
// can show live indexed / skipped counts without extra cursor control.

let _indexedCount = 0;
let _skippedCount = 0;

// Tracks how many TTY lines are currently in the progress block (1–3).
let _displayedLines = 1;

// Tracks the last percent milestone printed in non-TTY mode.
let _lastReportedPercent = -1;

export function setProgressStats(indexed: number, skipped: number): void {
  _indexedCount = indexed;
  _skippedCount = skipped;
}

export function resetProgressStats(): void {
  _indexedCount = 0;
  _skippedCount = 0;
  _displayedLines = 1;
  _lastReportedPercent = -1;
}

// ─── Lifecycle helpers ─────────────────────────────────────────────────────

/**
 * Call once before the processing loop begins.
 * TTY: writes 2 blank lines below and moves cursor back up, reserving space
 *      for up to 3 lines (progress + indexed + skipped). The actual number
 *      of rendered lines grows dynamically as counts become non-zero.
 * Non-TTY: writes a single blank line as a visual separator.
 */
export function reserveProgressLines(): void {
  if (process.stdout.isTTY) {
    _displayedLines = 1;
    // Reserve lines 2 and 3 below the current cursor (line 1).
    process.stdout.write("\n\n\u001B[2A");
  } else {
    process.stdout.write("\n");
  }
}

/**
 * Call once after the processing loop ends (replaces the bare `\n` write).
 * Advances the cursor past the lines actually used by the progress display
 * so subsequent output appears cleanly below without blank gaps.
 */
export function finalizeProgressDisplay(): void {
  if (process.stdout.isTTY) {
    // Cursor is on line 1; advance past only the lines we rendered.
    process.stdout.write("\n".repeat(_displayedLines));
  } else {
    process.stdout.write("\n");
  }
}

// ─── Main display function ─────────────────────────────────────────────────

/**
 * Writes the progress display to stdout.
 * TTY: overwrites the 3-line block in place on every call.
 * Non-TTY: prints a single line once per 1% increment.
 */
export function updateProgressDisplay(
  processed: number,
  total: number,
  startTime: number
): void {
  const elapsedMs = Math.max(1, Date.now() - startTime);
  const progress = Math.min(100, (processed / total) * 100);
  const progressBar = createProgressBar(progress);
  const eta = calculateETA(processed, total, elapsedMs / 1000);
  const recordsPerSecond = Math.round(processed / (elapsedMs / 1000));

  const progressLine =
    `   └─ ${progressBar} | ` +
    `${processed}/${total} | ` +
    `⏱ ${formatDuration(elapsedMs)} | ` +
    `🏁 ${eta} | ` +
    `⚡${recordsPerSecond} rows/sec`;

  if (!process.stdout.isTTY) {
    // Non-TTY: emit once per 1% step, resetting when a new file starts.
    const percentInt = Math.floor(progress);
    if (percentInt < _lastReportedPercent) {
      _lastReportedPercent = -1; // new file detected (percent went backwards)
    }
    if (percentInt <= _lastReportedPercent && processed !== total) return;
    _lastReportedPercent = percentInt;

    const stats =
      _indexedCount > 0 ? ` | 📦 ${_indexedCount.toLocaleString()} indexed` : "";
    const skippedStats =
      _skippedCount > 0 ? ` | ⏭ ${_skippedCount.toLocaleString()} skipped` : "";
    process.stdout.write(progressLine + stats + skippedStats + "\n");
    return;
  }

  // TTY: build only non-empty lines so no blank gaps appear.
  const lines: string[] = [progressLine];
  if (_indexedCount > 0) {
    lines.push(`   └─ indexed ${_indexedCount.toLocaleString()} records`);
  }
  if (_skippedCount > 0) {
    lines.push(`   └─ found ${_skippedCount.toLocaleString()} duplicate records`);
  }

  // Grow the block if new lines appeared (never shrink during a run).
  if (lines.length > _displayedLines) {
    _displayedLines = lines.length;
  }

  // Write all tracked lines (pad with empty clears for any unused slots).
  let output = `\r\u001B[2K${lines[0]}`;
  for (let i = 1; i < _displayedLines; i++) {
    output += `\n\r\u001B[2K${lines[i] || ""}`;
  }
  // Move cursor back to line 1.
  if (_displayedLines > 1) {
    output += `\u001B[${_displayedLines - 1}A\r`;
  }

  process.stdout.write(output);
}
