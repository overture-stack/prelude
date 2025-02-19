import { describe, it } from "node:test";
import assert from "node:assert";
import path from "path";
import fs from "node:fs";
import { ArrangerCommand } from "../../src/commands/arrangerCommand";
import { mockFileSystem, testUtils } from "./setup";
import { CLIOutput, Profiles } from "../../src/types";
import { ComposerError } from "../../src/utils/errors";

// Wrapper class to expose protected methods for testing
class TestArrangerCommand extends ArrangerCommand {
  // Public wrapper for protected execute method
  public async testExecute(cliOutput: CLIOutput) {
    return this.execute(cliOutput);
  }

  // Public wrapper for protected validate method
  public async testValidate(cliOutput: CLIOutput) {
    return this.validate(cliOutput);
  }
}

describe("ArrangerCommand", () => {
  const createTestOutput = (overrides: Partial<CLIOutput> = {}): CLIOutput => ({
    profile: Profiles.GENERATE_ARRANGER_CONFIGS,
    mode: "all",
    filePaths: [path.join(testUtils.fixturesDir, "mapping.json")],
    outputPath: path.join(testUtils.outputDir, "arranger"),
    config: {
      elasticsearch: {
        index: "test-index",
        shards: 1,
        replicas: 0,
      },
      delimiter: ",",
    },
    envConfig: {
      dataFile: "",
      indexName: "test-index",
      fileMetadataSample: "",
      tabularSample: "",
      songSchema: "",
      lecternDictionary: "",
      esConfigDir: "",
      arrangerConfigDir: "",
    },
    arrangerConfig: {
      documentType: "file",
      extendedFields: ["field1"],
      tableColumns: ["field1", "field2"],
      facetFields: ["field1"],
    },
    ...overrides,
  });

  it("generates arranger configs", async () => {
    // Ensure output directory exists
    const arrangerOutputDir = path.join(testUtils.outputDir, "arranger");
    if (!fs.existsSync(arrangerOutputDir)) {
      fs.mkdirSync(arrangerOutputDir, { recursive: true });
    }

    // Prepare test input
    const inputFile = path.join(testUtils.fixturesDir, "mapping.json");
    mockFileSystem.addFile(
      inputFile,
      JSON.stringify({
        mappings: {
          properties: {
            field1: { type: "keyword" },
            field2: { type: "integer" },
          },
        },
      })
    );

    // Create command and execute
    const command = new TestArrangerCommand();
    const cliOutput = createTestOutput();

    // Execute the command
    const result = await command.testExecute(cliOutput);

    // Assertions
    assert.ok(result, "Command should return a result");

    // Check that config files are created
    const expectedFiles = [
      "base.json",
      "extended.json",
      "table.json",
      "facets.json",
    ];

    expectedFiles.forEach((filename) => {
      const fullPath = path.join(arrangerOutputDir, filename);
      assert.ok(
        fs.existsSync(fullPath),
        `Output arranger config file ${filename} should be created`
      );
    });
  });

  it("validates document type", async () => {
    const command = new TestArrangerCommand();

    // Test with invalid document type
    const invalidOutput = createTestOutput({
      arrangerConfig: {
        documentType: "invalid" as any,
        extendedFields: ["field1"],
        tableColumns: ["field1", "field2"],
        facetFields: ["field1"],
      },
    });

    await assert.rejects(
      () => command.testValidate(invalidOutput),
      (err: Error) => {
        assert.ok(
          err instanceof ComposerError,
          "Should throw validation error for invalid document type"
        );
        return true;
      }
    );
  });

  it("handles missing input files", async () => {
    const command = new TestArrangerCommand();

    const invalidOutput = createTestOutput({
      filePaths: [],
    });

    await assert.rejects(
      () => command.testValidate(invalidOutput),
      (err: Error) => {
        assert.ok(
          err instanceof ComposerError,
          "Should throw validation error for missing input files"
        );
        return true;
      }
    );
  });
});
