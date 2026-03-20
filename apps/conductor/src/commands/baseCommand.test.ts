import { describe, it, expect, vi } from "vitest";
import { Command, CommandResult } from "./baseCommand";
import { CLIOutput } from "../types/cli";
import { ConductorError, ErrorCodes } from "../utils/errors";

// Minimal CLIOutput for tests — only fields processFiles cares about
function makeCLIOutput(): CLIOutput {
  return {
    profile: "upload",
    filePaths: [],
    config: {
      elasticsearch: { url: "http://localhost:9200", index: "data" },
      batchSize: 1000,
      delimiter: ",",
    },
    options: {},
  };
}

// Concrete subclass exposing processFiles for testing
class TestCommand extends Command {
  constructor() {
    super("test");
  }

  protected async execute(_cliOutput: CLIOutput): Promise<CommandResult> {
    return { success: true };
  }

  public callProcessFiles(
    filePaths: string[],
    processor: (fp: string) => Promise<void>
  ) {
    return this.processFiles(filePaths, processor);
  }
}

describe("processFiles", () => {
  const cmd = new TestCommand();

  it("returns success when all files process without error", async () => {
    const processor = vi.fn().mockResolvedValue(undefined);
    const result = await cmd.callProcessFiles(["a.csv", "b.csv"], processor);
    expect(result.success).toBe(true);
    expect(result.details?.filesProcessed).toBe(2);
    expect(processor).toHaveBeenCalledTimes(2);
  });

  it("returns failure when all files fail", async () => {
    const processor = vi.fn().mockRejectedValue(new Error("boom"));
    const result = await cmd.callProcessFiles(["a.csv"], processor);
    expect(result.success).toBe(false);
    expect(result.errorCode).toBe("PROCESSING_FAILED");
  });

  it("returns partial success when some files fail", async () => {
    const processor = vi
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("fail"));
    const result = await cmd.callProcessFiles(["ok.csv", "bad.csv"], processor);
    expect(result.success).toBe(true);
    expect(result.details?.filesProcessed).toBe(1);
    expect(result.details?.filesFailed).toBe(1);
  });

  it("records ConductorError details per file", async () => {
    const err = new ConductorError("bad csv", ErrorCodes.CSV_ERROR, { row: 5 });
    const processor = vi.fn().mockRejectedValue(err);
    const result = await cmd.callProcessFiles(["bad.csv"], processor);
    expect(result.success).toBe(false);
    const details = result.details as Record<string, unknown>;
    expect(details["bad.csv"]).toMatchObject({ code: ErrorCodes.CSV_ERROR });
  });

  it("returns success with no details when file list is empty", async () => {
    const processor = vi.fn();
    const result = await cmd.callProcessFiles([], processor);
    expect(result.success).toBe(true);
    expect(processor).not.toHaveBeenCalled();
  });
});
