import { describe, it, expect, vi, beforeEach } from "vitest";
import { sendBulkWriteRequest } from "./bulk";
import { ConductorError } from "../../utils/errors";
import { Logger } from "../../utils/logger";

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeClient(overrides: Partial<{ bulk: ReturnType<typeof vi.fn> }> = {}) {
  return {
    bulk: overrides.bulk ?? vi.fn(),
  } as any;
}

function bulkResponse(items: Array<{ error?: { type: string; reason: string }; result?: string }>) {
  const hasErrors = items.some((i) => i.error !== undefined);
  return {
    body: {
      errors: hasErrors,
      items: items.map((i) =>
        i.error
          ? { index: { _id: "1", status: 400, error: i.error } }
          : { index: { _id: "1", status: 200, result: i.result ?? "created" } }
      ),
    },
  };
}

const records = [
  { data: { n: 1, spearmanp: 0.001 } },
  { data: { n: 2, spearmanp: 0.002 } },
];

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("sendBulkWriteRequest", () => {
  beforeEach(() => {
    vi.spyOn(Logger, "warnString").mockImplementation(() => {});
    vi.spyOn(Logger, "debugString").mockImplementation(() => {});
    vi.spyOn(Logger, "generic").mockImplementation(() => {});
    vi.spyOn(Logger, "info").mockImplementation(() => {});
    vi.spyOn(Logger, "suggestion").mockImplementation(() => {});
  });

  describe("success cases", () => {
    it("resolves without calling onFailure when all records index successfully", async () => {
      const client = makeClient({
        bulk: vi.fn().mockResolvedValue(bulkResponse([{ result: "created" }, { result: "created" }])),
      });
      const onFailure = vi.fn();

      await sendBulkWriteRequest(client, records, "test-index", onFailure, { writeErrorLog: false });

      expect(onFailure).not.toHaveBeenCalled();
    });

    it("calls onIndexed with correct created and updated counts", async () => {
      const client = makeClient({
        bulk: vi.fn().mockResolvedValue(
          bulkResponse([{ result: "created" }, { result: "updated" }])
        ),
      });
      const onFailure = vi.fn();
      const onIndexed = vi.fn();

      await sendBulkWriteRequest(client, records, "test-index", onFailure, { writeErrorLog: false }, onIndexed);

      expect(onIndexed).toHaveBeenCalledWith(1, 1);
    });

    it("includes _id in bulk action when record has _id field", async () => {
      const bulkFn = vi.fn().mockResolvedValue(bulkResponse([{ result: "created" }]));
      const client = makeClient({ bulk: bulkFn });

      await sendBulkWriteRequest(
        client,
        [{ _id: "my-id", value: 42 }],
        "test-index",
        vi.fn(),
        { writeErrorLog: false }
      );

      const [callArg] = bulkFn.mock.calls[0];
      expect(callArg.body[0]).toEqual({ index: { _index: "test-index", _id: "my-id" } });
    });

    it("omits _id from bulk action when record has no _id field", async () => {
      const bulkFn = vi.fn().mockResolvedValue(bulkResponse([{ result: "created" }]));
      const client = makeClient({ bulk: bulkFn });

      await sendBulkWriteRequest(
        client,
        [{ value: 42 }],
        "test-index",
        vi.fn(),
        { writeErrorLog: false }
      );

      const [callArg] = bulkFn.mock.calls[0];
      expect(callArg.body[0]).toEqual({ index: { _index: "test-index" } });
    });
  });

  describe("partial failure", () => {
    it("calls onFailure with error count and resolves when some records fail", async () => {
      const client = makeClient({
        bulk: vi.fn().mockResolvedValue(
          bulkResponse([
            { result: "created" },
            { error: { type: "mapper_parsing_exception", reason: "failed to parse field [n] of type [integer]" } },
          ])
        ),
      });
      const onFailure = vi.fn();

      await sendBulkWriteRequest(client, records, "test-index", onFailure, { writeErrorLog: false });

      expect(onFailure).toHaveBeenCalledWith(1);
    });
  });

  describe("all records rejected", () => {
    it("retries up to maxRetries then throws ConductorError", async () => {
      const mappingError = { type: "mapper_parsing_exception", reason: "failed to parse field [spearmanp] of type [integer]" };
      const bulkFn = vi.fn().mockResolvedValue(
        bulkResponse([{ error: mappingError }, { error: mappingError }])
      );
      const client = makeClient({ bulk: bulkFn });

      await expect(
        sendBulkWriteRequest(client, records, "test-index", vi.fn(), {
          maxRetries: 2,
          writeErrorLog: false,
        })
      ).rejects.toBeInstanceOf(ConductorError);

      expect(bulkFn).toHaveBeenCalledTimes(2);
    });

    it("throws with 'Data type validation failed' message", async () => {
      const mappingError = { type: "mapper_parsing_exception", reason: "failed to parse field [pearsonp] of type [integer]" };
      const client = makeClient({
        bulk: vi.fn().mockResolvedValue(bulkResponse([{ error: mappingError }])),
      });

      await expect(
        sendBulkWriteRequest(client, [records[0]], "test-index", vi.fn(), {
          maxRetries: 1,
          writeErrorLog: false,
        })
      ).rejects.toThrow("Data type validation failed");
    });
  });

  describe("network errors", () => {
    it("retries on network failure and throws ConductorError after exhausting retries", async () => {
      const networkError = Object.assign(new Error("connect ECONNREFUSED"), { code: "ECONNREFUSED" });
      const bulkFn = vi.fn().mockRejectedValue(networkError);
      const client = makeClient({ bulk: bulkFn });

      await expect(
        sendBulkWriteRequest(client, records, "test-index", vi.fn(), {
          maxRetries: 2,
          writeErrorLog: false,
        })
      ).rejects.toBeInstanceOf(ConductorError);

      expect(bulkFn).toHaveBeenCalledTimes(2);
    });

    it("calls onFailure with full record count on network error", async () => {
      const bulkFn = vi.fn().mockRejectedValue(new Error("ETIMEDOUT"));
      const client = makeClient({ bulk: bulkFn });
      const onFailure = vi.fn();

      await expect(
        sendBulkWriteRequest(client, records, "test-index", onFailure, {
          maxRetries: 1,
          writeErrorLog: false,
        })
      ).rejects.toBeInstanceOf(ConductorError);

      expect(onFailure).toHaveBeenCalledWith(records.length);
    });
  });

  describe("error summary logging", () => {
    it("logs mapping type mismatch field name", async () => {
      const mappingError = {
        type: "mapper_parsing_exception",
        reason: "failed to parse field [spearmanp] of type [integer] in document with id '1'. Preview of field's value: '0.001'",
      };
      const client = makeClient({
        bulk: vi.fn().mockResolvedValue(bulkResponse([{ error: mappingError }])),
      });
      const genericSpy = vi.spyOn(Logger, "generic");

      await expect(
        sendBulkWriteRequest(client, [records[0]], "test-index", vi.fn(), {
          maxRetries: 1,
          writeErrorLog: false,
        })
      ).rejects.toBeInstanceOf(ConductorError);

      const allCalls = genericSpy.mock.calls.map(([msg]) => msg);
      expect(allCalls.some((m) => m.includes("spearmanp"))).toBe(true);
      expect(allCalls.some((m) => m.includes('update "spearmanp" type'))).toBe(true);
    });

    it("logs sample values received in the error summary", async () => {
      const mappingError = {
        type: "mapper_parsing_exception",
        reason: "failed to parse field [pearsonp] of type [integer]. Preview of field's value: '0.000042'",
      };
      const client = makeClient({
        bulk: vi.fn().mockResolvedValue(bulkResponse([{ error: mappingError }])),
      });
      const genericSpy = vi.spyOn(Logger, "generic");

      await expect(
        sendBulkWriteRequest(client, [records[0]], "test-index", vi.fn(), {
          maxRetries: 1,
          writeErrorLog: false,
        })
      ).rejects.toBeInstanceOf(ConductorError);

      const allCalls = genericSpy.mock.calls.map(([msg]) => msg);
      expect(allCalls.some((m) => m.includes("0.000042"))).toBe(true);
    });

    it("displays error summary only once across retries", async () => {
      const mappingError = { type: "mapper_parsing_exception", reason: "failed to parse field [n] of type [integer]" };
      const client = makeClient({
        bulk: vi.fn().mockResolvedValue(bulkResponse([{ error: mappingError }])),
      });
      const infoSpy = vi.spyOn(Logger, "info");

      await expect(
        sendBulkWriteRequest(client, [records[0]], "test-index", vi.fn(), {
          maxRetries: 3,
          writeErrorLog: false,
        })
      ).rejects.toBeInstanceOf(ConductorError);

      expect(infoSpy).toHaveBeenCalledTimes(1);
    });
  });
});
