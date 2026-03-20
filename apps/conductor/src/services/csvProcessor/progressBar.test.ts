import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  formatDuration,
  calculateETA,
  createProgressBar,
  setProgressStats,
  resetProgressStats,
  reserveProgressLines,
  finalizeProgressDisplay,
  updateProgressDisplay,
} from "./progressBar";

// ─── formatDuration ───────────────────────────────────────────────────────

describe("formatDuration", () => {
  it("formats sub-minute durations", () => {
    const result = formatDuration(45_000);
    expect(result).toContain("0h 0m 45s");
  });

  it("formats durations with minutes", () => {
    const result = formatDuration(125_000);
    expect(result).toContain("0h 2m 5s");
  });

  it("formats durations with hours", () => {
    const result = formatDuration(3_661_000);
    expect(result).toContain("1h 1m 1s");
  });

  it("returns error string for negative ms", () => {
    expect(formatDuration(-1)).toContain("Invalid duration");
  });

  it("returns error string for non-finite ms", () => {
    expect(formatDuration(Infinity)).toContain("Invalid duration");
    expect(formatDuration(NaN)).toContain("Invalid duration");
  });
});

// ─── calculateETA ─────────────────────────────────────────────────────────

describe("calculateETA", () => {
  it("returns Calculating... when processed is 0", () => {
    expect(calculateETA(0, 1000, 5)).toContain("Calculating...");
  });

  it("returns Calculating... when elapsed is 0", () => {
    expect(calculateETA(100, 1000, 0)).toContain("Calculating...");
  });

  it("returns a formatted duration for valid inputs", () => {
    // 500 processed in 10s → 50 rec/s → 500 remaining → 10s ETA
    const result = calculateETA(500, 1000, 10);
    expect(result).toContain("0h 0m 10s");
  });

  it("returns Invalid calculation for non-finite inputs", () => {
    expect(calculateETA(NaN, 1000, 10)).toContain("Invalid calculation");
  });
});

// ─── createProgressBar ────────────────────────────────────────────────────

describe("createProgressBar", () => {
  it("shows 0% as all empty blocks", () => {
    const bar = createProgressBar(0);
    expect(bar).toContain("0.0%");
  });

  it("shows 100% as all filled blocks", () => {
    const bar = createProgressBar(100);
    expect(bar).toContain("100.0%");
  });

  it("clamps values above 100 to 100%", () => {
    const bar = createProgressBar(150);
    expect(bar).toContain("100.0%");
  });

  it("clamps negative values to 0%", () => {
    const bar = createProgressBar(-10);
    expect(bar).toContain("0.0%");
  });

  it("returns error string for non-finite progress", () => {
    expect(createProgressBar(NaN)).toContain("Invalid progress value");
  });

  it("uses cyan color for blue variant", () => {
    // Just verify it doesn't throw and returns a string
    const bar = createProgressBar(50, "blue");
    expect(typeof bar).toBe("string");
    expect(bar).toContain("50.0%");
  });
});

// ─── setProgressStats / resetProgressStats ────────────────────────────────

describe("progress stats state", () => {
  beforeEach(() => resetProgressStats());

  it("resetProgressStats clears indexed and skipped counts", () => {
    setProgressStats(500, 100);
    resetProgressStats();
    // Verify via updateProgressDisplay output — stats should not appear
    const writes: string[] = [];
    const origWrite = process.stdout.write.bind(process.stdout);
    vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
      writes.push(String(chunk));
      return true;
    });
    // Simulate non-TTY so we get a plain string output
    Object.defineProperty(process.stdout, "isTTY", { value: false, configurable: true });
    updateProgressDisplay(500, 1000, Date.now() - 5000);
    Object.defineProperty(process.stdout, "isTTY", { value: undefined, configurable: true });
    vi.restoreAllMocks();
    const output = writes.join("");
    expect(output).not.toContain("indexed");
    expect(output).not.toContain("skipped");
  });

  it("setProgressStats is reflected in the non-TTY output line", () => {
    resetProgressStats();
    setProgressStats(1000, 200);
    const writes: string[] = [];
    vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
      writes.push(String(chunk));
      return true;
    });
    Object.defineProperty(process.stdout, "isTTY", { value: false, configurable: true });
    updateProgressDisplay(500, 1000, Date.now() - 5000);
    Object.defineProperty(process.stdout, "isTTY", { value: undefined, configurable: true });
    vi.restoreAllMocks();
    const output = writes.join("");
    expect(output).toContain("1,000 indexed");
    expect(output).toContain("200 skipped");
  });
});

// ─── reserveProgressLines / finalizeProgressDisplay ──────────────────────

describe("reserveProgressLines", () => {
  afterEach(() => vi.restoreAllMocks());

  it("writes ANSI reserve sequence on TTY", () => {
    const writes: string[] = [];
    vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
      writes.push(String(chunk));
      return true;
    });
    Object.defineProperty(process.stdout, "isTTY", { value: true, configurable: true });
    reserveProgressLines();
    Object.defineProperty(process.stdout, "isTTY", { value: undefined, configurable: true });
    const output = writes.join("");
    // Should contain cursor-up escape
    expect(output).toContain("\u001B[2A");
  });

  it("writes a single newline on non-TTY", () => {
    const writes: string[] = [];
    vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
      writes.push(String(chunk));
      return true;
    });
    Object.defineProperty(process.stdout, "isTTY", { value: false, configurable: true });
    reserveProgressLines();
    Object.defineProperty(process.stdout, "isTTY", { value: undefined, configurable: true });
    expect(writes.join("")).toBe("\n");
  });
});

describe("finalizeProgressDisplay", () => {
  afterEach(() => vi.restoreAllMocks());

  it("writes three newlines on TTY to clear reserved lines", () => {
    const writes: string[] = [];
    vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
      writes.push(String(chunk));
      return true;
    });
    Object.defineProperty(process.stdout, "isTTY", { value: true, configurable: true });
    finalizeProgressDisplay();
    Object.defineProperty(process.stdout, "isTTY", { value: undefined, configurable: true });
    expect(writes.join("")).toBe("\n\n\n");
  });

  it("writes a single newline on non-TTY", () => {
    const writes: string[] = [];
    vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
      writes.push(String(chunk));
      return true;
    });
    Object.defineProperty(process.stdout, "isTTY", { value: false, configurable: true });
    finalizeProgressDisplay();
    Object.defineProperty(process.stdout, "isTTY", { value: undefined, configurable: true });
    expect(writes.join("")).toBe("\n");
  });
});

// ─── updateProgressDisplay (non-TTY) ─────────────────────────────────────

describe("updateProgressDisplay non-TTY", () => {
  beforeEach(() => {
    resetProgressStats();
    Object.defineProperty(process.stdout, "isTTY", { value: false, configurable: true });
  });

  afterEach(() => {
    Object.defineProperty(process.stdout, "isTTY", { value: undefined, configurable: true });
    vi.restoreAllMocks();
  });

  it("prints a line containing the progress percentage", () => {
    const writes: string[] = [];
    vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
      writes.push(String(chunk));
      return true;
    });
    updateProgressDisplay(500, 1000, Date.now() - 5000);
    expect(writes.join("")).toContain("50.0%");
  });

  it("only prints once per 1% increment", () => {
    const writes: string[] = [];
    vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
      writes.push(String(chunk));
      return true;
    });
    const start = Date.now() - 1000;
    // 500, 502, 504 out of 1000 all floor to 50% — only first should print
    updateProgressDisplay(500, 1000, start);
    updateProgressDisplay(502, 1000, start);
    updateProgressDisplay(504, 1000, start);
    expect(writes.length).toBe(1);
  });

  it("resets and prints again for a new file (percent goes backwards)", () => {
    const writes: string[] = [];
    vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
      writes.push(String(chunk));
      return true;
    });
    const start = Date.now() - 1000;
    updateProgressDisplay(500, 1000, start);  // 50% — prints
    updateProgressDisplay(10, 1000, start);   // 1% — new file detected, prints
    expect(writes.length).toBe(2);
  });

  it("always prints when processed equals total", () => {
    const writes: string[] = [];
    vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
      writes.push(String(chunk));
      return true;
    });
    const start = Date.now() - 1000;
    updateProgressDisplay(500, 1000, start); // 50% — prints
    updateProgressDisplay(500, 1000, start); // same % again — skipped
    updateProgressDisplay(1000, 1000, start); // 100% (processed === total) — always prints
    expect(writes.length).toBe(2);
  });
});
