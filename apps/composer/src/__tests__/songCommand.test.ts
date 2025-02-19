import { describe, it } from "node:test";
import assert from "node:assert";
import path from "node:path";
import fs from "node:fs";
import { SongCommand } from "../commands/songCommand";
import { mockFileSystem, testUtils } from "./setup";
import { CLIOutput, Profiles } from "../types";
import { ComposerError } from "../utils/errors";

// Wrapper class to expose protected methods for testing
class SongCommandTest extends SongCommand {
  // Public wrapper for protected execute method
  public async testExecute(cliOutput: CLIOutput) {
    console.log("Executing SongCommand with output:", cliOutput);
    const result = await this.execute(cliOutput);
    console.log("Execute result:", result);
    return result;
  }

  // Public wrapper for protected validate method
  public async testValidate(cliOutput: CLIOutput) {
    return this.validate(cliOutput);
  }
}

describe("SongCommand", () => {
  const createTestOutput = (overrides: Partial<CLIOutput> = {}): CLIOutput => ({
    profile: Profiles.GENERATE_SONG_SCHEMA,
    mode: "all",
    filePaths: [path.join(testUtils.fixturesDir, "metadata.json")],
    outputPath: path.join(testUtils.outputDir, "schema.json"),
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
    ...overrides,
  });

  it("generates song schema from metadata", async () => {
    // Prepare test input
    const inputFile = path.join(testUtils.fixturesDir, "metadata.json");
    mockFileSystem.addFile(
      inputFile,
      JSON.stringify({
        experiment: {
          name: "Test Experiment",
          description: "Test description",
          study_id: "TEST-STUDY",
        },
      })
    );

    // Create command and execute
    const command = new SongCommandTest();
    const cliOutput = createTestOutput();

    await command.testExecute(cliOutput);

    // Assert that the output file was created on disk
    assert.ok(
      fs.existsSync(path.join(testUtils.outputDir, "schema.json")),
      "Output schema file should be created"
    );
  });

  it("validates input file type", async () => {
    const command = new SongCommandTest();

    // Test with invalid input file
    const invalidOutput = createTestOutput({
      filePaths: [path.join(testUtils.fixturesDir, "sample.csv")],
    });

    await assert.rejects(
      () => command.testValidate(invalidOutput),
      (err: Error) => {
        assert.ok(
          err instanceof ComposerError,
          "Should throw validation error for invalid input"
        );
        return true;
      }
    );
  });

  it("handles missing input files", async () => {
    const command = new SongCommandTest();

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
