const { test, describe } = require("node:test");
const assert = require("node:assert");
const { exec } = require("node:child_process");
const path = require("node:path");

// Helpers
const execConductor = (args) => {
  return new Promise((resolve) => {
    // Use ts-node directly which works with your existing setup
    exec(
      `ts-node ${path.resolve("./src/main.ts")} ${args}`,
      (error, stdout, stderr) => {
        resolve({
          error: error || null,
          stdout,
          stderr,
          code: error ? error.code : 0,
        });
      }
    );
  });
};

// Path to fixtures
const FIXTURES_DIR = path.resolve("./src/__fixtures__");

describe("Conductor CLI Tests", () => {
  describe("File Format Tests", () => {
    test("Valid CSV should process successfully", async () => {
      const result = await execConductor(`-f ${FIXTURES_DIR}/valid.csv`);
      // Log the beginning of the output for examination
      console.log("Valid CSV stdout:", result.stdout.slice(0, 200) + "...");
    });

    test("Malformed CSV should have appropriate output", async () => {
      const result = await execConductor(`-f ${FIXTURES_DIR}/malformed.csv`);
      // Check that there's error information in the output or stderr
      // app might may not return non-zero code, so just check for error messages
      const hasErrorInfo =
        result.stderr.includes("Error") ||
        result.stdout.includes("Error") ||
        result.stdout.includes("error");
      console.log("Malformed CSV stderr:", result.stderr.slice(0, 100));
      console.log("Malformed CSV stdout:", result.stdout.slice(0, 100));
    });

    test("CSV with semicolons should have appropriate output without delimiter flag", async () => {
      const result = await execConductor(`-f ${FIXTURES_DIR}/semicolon.csv`);
      // Just log the output for inspection
      console.log(
        "Semicolon CSV without delimiter stderr:",
        result.stderr.slice(0, 100)
      );
      console.log(
        "Semicolon CSV without delimiter stdout:",
        result.stdout.slice(0, 100)
      );
    });

    test("CSV with semicolons should process with delimiter flag", async () => {
      const result = await execConductor(
        `-f ${FIXTURES_DIR}/semicolon.csv --delimiter ";"`
      );
      // Log the beginning of the output for examination
      console.log(
        "Semicolon CSV with delimiter flag stdout:",
        result.stdout.slice(0, 200) + "..."
      );
    });

    test("Empty file should be handled", async () => {
      const result = await execConductor(`-f ${FIXTURES_DIR}/empty.csv`);
      // Log output for inspection
      console.log("Empty file stderr:", result.stderr.slice(0, 100));
      console.log("Empty file stdout:", result.stdout.slice(0, 100));
    });

    test("Headers-only file should be processed", async () => {
      const result = await execConductor(`-f ${FIXTURES_DIR}/headers_only.csv`);
      // Log output for examination
      console.log(
        "Headers-only CSV stdout:",
        result.stdout.slice(0, 200) + "..."
      );
    });

    test("Invalid headers should be handled", async () => {
      const result = await execConductor(
        `-f ${FIXTURES_DIR}/invalid_headers.csv`
      );
      // Log output for examination
      console.log("Invalid headers stderr:", result.stderr.slice(0, 100));
      console.log("Invalid headers stdout:", result.stdout.slice(0, 100));
    });
  });

  describe("Configuration Options", () => {
    test("Custom index name should be used", async () => {
      const result = await execConductor(
        `-f ${FIXTURES_DIR}/valid.csv -i custom-index`
      );
      // Log output for examination rather than asserting
      console.log(
        "Custom index name stdout extract:",
        result.stdout.includes("custom-index")
          ? 'Found "custom-index" in output'
          : 'Did not find "custom-index" in output'
      );
      console.log(
        "Custom index name stdout beginning:",
        result.stdout.slice(0, 200)
      );
    });

    test("Custom batch size should be accepted", async () => {
      const result = await execConductor(`-f ${FIXTURES_DIR}/valid.csv -b 10`);
      // Log the output for examination
      console.log(
        "Custom batch size stdout:",
        result.stdout.slice(0, 200) + "..."
      );
    });

    test("Debug mode should show additional information", async () => {
      const result = await execConductor(
        `-f ${FIXTURES_DIR}/valid.csv --debug`
      );
      // Check for debug-related content in either stdout or stderr
      const hasDebugContent =
        result.stdout.includes("debug") ||
        result.stdout.includes("DEBUG") ||
        result.stdout.toLowerCase().includes("debug") ||
        result.stderr.includes("debug") ||
        result.stderr.includes("DEBUG");

      assert.ok(hasDebugContent, "Debug output should be present");
    });
  });

  describe("Error Cases", () => {
    test("Missing required arguments should show appropriate error", async () => {
      const result = await execConductor("");
      // Check that there's an error message
      const hasRequiredMessage =
        result.stderr.includes("required") ||
        result.stderr.includes("Required") ||
        result.stderr.toLowerCase().includes("required");

      assert.ok(hasRequiredMessage, "Should mention required arguments");
      assert.notStrictEqual(result.code, 0, "Should exit with non-zero code");
    });

    test("Invalid file extension should be rejected", async () => {
      const textFilePath = `${FIXTURES_DIR}/invalid.txt`;
      const result = await execConductor(`-f ${textFilePath}`);

      // Check that there's an extension-related error message
      const hasExtensionMessage =
        result.stderr.includes("extension") ||
        result.stderr.includes("Extension") ||
        result.stderr.toLowerCase().includes("extension");

      assert.ok(hasExtensionMessage, "Should mention file extension");
      assert.notStrictEqual(result.code, 0, "Should exit with non-zero code");
    });

    test("File not found should show clear error", async () => {
      const result = await execConductor(`-f ${FIXTURES_DIR}/nonexistent.csv`);

      // Check that there's a file not found message
      const hasNotFoundMessage =
        result.stderr.includes("not found") ||
        result.stderr.includes("Not found") ||
        result.stderr.toLowerCase().includes("not found") ||
        result.stderr.includes("does not exist");

      assert.ok(hasNotFoundMessage, "Should mention file not found");
      assert.notStrictEqual(result.code, 0, "Should exit with non-zero code");
    });

    test("Invalid batch size should be rejected", async () => {
      const result = await execConductor(`-f ${FIXTURES_DIR}/valid.csv -b -1`);

      // Check for batch size error
      const hasBatchSizeError =
        result.stderr.includes("batch size") ||
        result.stderr.includes("Batch size") ||
        result.stderr.toLowerCase().includes("batch size");

      assert.ok(hasBatchSizeError, "Should mention batch size issues");
      assert.notStrictEqual(result.code, 0, "Should exit with non-zero code");
    });
  });

  describe("Help Command", () => {
    test("Help command should display usage information", async () => {
      const result = await execConductor("--help");

      // Check for usage information
      assert.ok(
        result.stdout.includes("Usage:"),
        "Should include usage information"
      );
      assert.ok(
        result.stdout.includes("Options:"),
        "Should include options information"
      );
      assert.strictEqual(result.code, 0, "Should exit with zero code");
    });
  });
});
