import { describe, it, expect } from "vitest";
import { parseCSVLine } from "./csvParser";
import { ConductorError } from "../../utils/errors";

describe("parseCSVLine", () => {
  describe("basic parsing", () => {
    it("parses a simple comma-delimited line", () => {
      const result = parseCSVLine("a,b,c", ",");
      expect(result[0]).toEqual(["a", "b", "c"]);
    });

    it("parses a semicolon-delimited line", () => {
      const result = parseCSVLine("x;y;z", ";");
      expect(result[0]).toEqual(["x", "y", "z"]);
    });

    it("trims whitespace from values", () => {
      const result = parseCSVLine(" a , b , c ", ",");
      expect(result[0]).toEqual(["a", "b", "c"]);
    });

    it("handles quoted fields containing the delimiter", () => {
      const result = parseCSVLine('"hello, world",b', ",");
      expect(result[0]).toEqual(["hello, world", "b"]);
    });

    it("returns empty array for a blank line", () => {
      const result = parseCSVLine("   ", ",");
      expect(result).toEqual([]);
    });
  });

  describe("header row mode", () => {
    it("returns the header row wrapped in an outer array", () => {
      const result = parseCSVLine("name,age,city", ",", true);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(["name", "age", "city"]);
    });
  });

  describe("error cases", () => {
    it("throws ConductorError for an invalid delimiter (empty string)", () => {
      expect(() => parseCSVLine("a,b", "")).toThrow(ConductorError);
    });

    it("throws ConductorError for a multi-character delimiter", () => {
      expect(() => parseCSVLine("a,b", ",,")).toThrow(ConductorError);
    });
  });
});
