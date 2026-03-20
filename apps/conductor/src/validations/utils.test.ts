import { describe, it, expect } from "vitest";
import { parseHostPort, validateDelimiter } from "./utils";
import { ConductorError } from "../utils/errors";

describe("parseHostPort", () => {
  it("splits host and port when colon is present", () => {
    expect(parseHostPort("localhost:5435", "5432")).toEqual({
      host: "localhost",
      port: 5435,
    });
  });

  it("uses default port when no colon is present", () => {
    expect(parseHostPort("localhost", "5432")).toEqual({
      host: "localhost",
      port: 5432,
    });
  });

  it("uses default port when port segment is not a number", () => {
    expect(parseHostPort("localhost:abc", "5432")).toEqual({
      host: "localhost",
      port: 5432,
    });
  });

  it("handles IP addresses with port", () => {
    expect(parseHostPort("192.168.1.1:9200", "9200")).toEqual({
      host: "192.168.1.1",
      port: 9200,
    });
  });

  it("handles remote hostnames", () => {
    expect(parseHostPort("es.example.com:443", "9200")).toEqual({
      host: "es.example.com",
      port: 443,
    });
  });
});

describe("validateDelimiter", () => {
  it("accepts a single comma", () => {
    expect(() => validateDelimiter(",")).not.toThrow();
  });

  it("accepts a single semicolon", () => {
    expect(() => validateDelimiter(";")).not.toThrow();
  });

  it("accepts a tab character", () => {
    expect(() => validateDelimiter("\t")).not.toThrow();
  });

  it("throws ConductorError for empty string", () => {
    expect(() => validateDelimiter("")).toThrow(ConductorError);
  });

  it("throws ConductorError for multi-character string", () => {
    expect(() => validateDelimiter(",,")).toThrow(ConductorError);
  });
});
