import { describe, it } from "node:test";
import assert from "node:assert";
import path from "node:path";
import { DictionaryCommand } from "../../src/commands/lecternCommand";
import { mockFileSystem, testUtils } from "./setup";
import { CLIOutput, Profiles } from "../../src/types";
import { ComposerError } from "../../src/utils/errors";

// Wrapper class to expose protected methods for testing
class TestDictionaryCommand extends DictionaryCommand {
  // Public wrapper for protected execute method
  public async testExecute(cliOutput: CLIOutput) {
    return this.execute(cliOutput);
  }

  // Public wrapper for protected validate method
  public async testValidate(cliOutput: CLIOutput) {
    return this.validate(cliOutput);
  }
}

describe("LecternCommand", () => {
  const createTestOutput = (overrides: Partial<CLIOutput> = {}): CLIOutput => ({
    profile: Profiles.GENERATE_LECTERN_DICTIONARY,
    mode: "all",
    filePaths: [path.join(testUtils.fixturesDir, "sample.csv")],
    outputPath: path.join(testUtils.outputDir, "lectern-dictionary.json"),
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
    dictionaryConfig: {
      name: "Test Lectern Dictionary",
      description: "Test Lectern Description",
      version: "1.0.0",
    },
    ...overrides,
  });

  it("generates lectern dictionary", async () => {
    // Prepare test input
    const inputFile = path.join(testUtils.fixturesDir, "sample.csv");
    mockFileSystem.addFile(inputFile, "field1,field2\nvalue1,value2");

    // Create command and execute
    const command = new TestDictionaryCommand();
    const cliOutput = createTestOutput();

    const result = await command.testExecute(cliOutput);

    // Assertions
    assert.ok(result, "Command should return a result");
    assert.ok(
      mockFileSystem.exists(
        path.join(testUtils.outputDir, "lectern-dictionary.json")
      ),
      "Output lectern dictionary file should be created"
    );
  });

  it("validates dictionary configuration", async () => {
    const command = new TestDictionaryCommand();

    // Test without dictionary config
    const invalidOutput = createTestOutput();
    delete (invalidOutput as any).dictionaryConfig;

    await assert.rejects(
      () => command.testValidate(invalidOutput),
      (err: Error) => {
        assert.ok(
          err instanceof ComposerError,
          "Should throw validation error for missing dictionary config"
        );
        return true;
      }
    );
  });

  it("handles missing input files", async () => {
    const command = new TestDictionaryCommand();

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
