import { describe, it, expect } from "vitest";
import { ComposerError, ErrorCodes, ErrorFactory } from "./errors";

describe("ComposerError", () => {
  it("sets name, message, code, and suggestions", () => {
    const err = new ComposerError("oops", ErrorCodes.INVALID_ARGS, undefined, ["fix it"]);
    expect(err.name).toBe("ComposerError");
    expect(err.message).toBe("oops");
    expect(err.code).toBe(ErrorCodes.INVALID_ARGS);
    expect(err.suggestions).toEqual(["fix it"]);
  });

  it("is an instance of Error", () => {
    expect(new ComposerError("x", ErrorCodes.ENV_ERROR)).toBeInstanceOf(Error);
  });
});

describe("ErrorFactory", () => {
  it("validation() uses VALIDATION_FAILED code", () => {
    const err = ErrorFactory.validation("bad");
    expect(err.code).toBe(ErrorCodes.VALIDATION_FAILED);
  });

  it("file() uses INVALID_FILE code and stores filePath in details", () => {
    const err = ErrorFactory.file("missing", "/some/path.csv");
    expect(err.code).toBe(ErrorCodes.INVALID_FILE);
    expect(err.details?.filePath).toBe("/some/path.csv");
  });

  it("args() uses INVALID_ARGS code", () => {
    const err = ErrorFactory.args("bad arg");
    expect(err.code).toBe(ErrorCodes.INVALID_ARGS);
  });

  it("generation() uses GENERATION_FAILED code", () => {
    const err = ErrorFactory.generation("failed");
    expect(err.code).toBe(ErrorCodes.GENERATION_FAILED);
  });

  it("environment() uses ENV_ERROR code", () => {
    const err = ErrorFactory.environment("bad env");
    expect(err.code).toBe(ErrorCodes.ENV_ERROR);
  });

  it("parsing() uses PARSING_ERROR code", () => {
    const err = ErrorFactory.parsing("parse fail");
    expect(err.code).toBe(ErrorCodes.PARSING_ERROR);
  });
});
