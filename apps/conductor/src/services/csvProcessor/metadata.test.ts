import { describe, it, expect } from "vitest";
import { createRecordMetadata, postgresRowToEsDocument } from "./metadata";

describe("createRecordMetadata", () => {
  it("returns required metadata fields", () => {
    const meta = createRecordMetadata("/data/users.csv");
    expect(meta).toHaveProperty("submission_id");
    expect(meta).toHaveProperty("source_file_name", "users.csv");
    expect(meta).toHaveProperty("processed_at");
  });

  it("extracts just the filename from a full path", () => {
    const meta = createRecordMetadata("/some/deep/path/to/records.csv");
    expect(meta.source_file_name).toBe("records.csv");
  });

  it("handles postgresql:// source identifiers", () => {
    const meta = createRecordMetadata("postgresql://my_table");
    expect(meta.source_file_name).toBe("my_table");
  });

  it("generates a deterministic id when recordData is provided", () => {
    const data = { name: "Alice", age: "30" };
    const first = createRecordMetadata("file.csv", data);
    const second = createRecordMetadata("file.csv", data);
    expect(first.submission_id).toBe(second.submission_id);
  });

  it("generates different ids for different record data", () => {
    const a = createRecordMetadata("file.csv", { name: "Alice" });
    const b = createRecordMetadata("file.csv", { name: "Bob" });
    expect(a.submission_id).not.toBe(b.submission_id);
  });

  it("generates a random uuid when no recordData is provided", () => {
    const first = createRecordMetadata("file.csv");
    const second = createRecordMetadata("file.csv");
    // Two calls without data should produce different ids
    expect(first.submission_id).not.toBe(second.submission_id);
  });

  it("processed_at is a valid ISO date string", () => {
    const meta = createRecordMetadata("file.csv");
    expect(() => new Date(meta.processed_at as string).toISOString()).not.toThrow();
  });
});

describe("postgresRowToEsDocument", () => {
  it("parses existing submission_metadata from the row", () => {
    const existingMeta = { submission_id: "abc-123", source_file_name: "t", processed_at: "now" };
    const row = {
      col1: "val1",
      submission_metadata: JSON.stringify(existingMeta),
    };
    const doc = postgresRowToEsDocument(row, "my_table");
    expect(doc._id).toBe("abc-123");
    expect(doc.submission_metadata).toEqual(existingMeta);
    expect((doc.data as Record<string, unknown>).col1).toBe("val1");
    expect((doc.data as Record<string, unknown>).submission_metadata).toBeUndefined();
  });

  it("generates new metadata when submission_metadata is absent", () => {
    const row = { col1: "val1", col2: "val2" };
    const doc = postgresRowToEsDocument(row, "my_table");
    expect(doc._id).toBeTruthy();
    expect(doc.submission_metadata).toHaveProperty("source_file_name", "my_table");
    expect((doc.data as Record<string, unknown>).col1).toBe("val1");
  });

  it("generates new metadata when submission_metadata is invalid JSON", () => {
    const row = { col1: "val1", submission_metadata: "not-json{" };
    const doc = postgresRowToEsDocument(row, "my_table");
    expect(doc.submission_metadata).toHaveProperty("source_file_name", "my_table");
  });

  it("excludes submission_metadata from data columns", () => {
    const row = { col1: "val", submission_metadata: "{}" };
    const doc = postgresRowToEsDocument(row, "t");
    expect(Object.keys(doc.data as object)).not.toContain("submission_metadata");
  });
});
