import { describe, it } from "node:test";
import assert from "node:assert";
import path from "node:path";
import { MappingCommand } from "../../src/commands/mappingCommands";
import { mockFileSystem, testUtils } from "./setup";
import { CLIOutput, Profiles } from "../../src/types";
import { ComposerError } from "../../src/utils/errors";

// Wrapper class to expose protected methods for testing
class TestMappingCommand extends MappingCommand {
  // Public wrapper for protected execute method
  public async testExecute(cliOutput: CLIOutput) {
    return this.execute(cliOutput);
  }

  // Public wrapper for protected validate method
  public async testValidate(cliOutput: CLIOutput) {
    return this.validate(cliOutput);
  }
}

describe("MappingCommand", () => {
  const createTestOutput = (
    inputFile: string,
    overrides: Partial<CLIOutput> = {}
  ): CLIOutput => ({
    profile: Profiles.GENERATE_ELASTICSEARCH_MAPPING,
    mode: "all",
    filePaths: [inputFile],
    outputPath: path.join(testUtils.outputDir, "mapping.json"),
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

  // Test cases for different input types
  const inputTestCases = [
    {
      name: "CSV input",
      prepareFile: () => {
        const csvFile = path.join(testUtils.fixturesDir, "sample.csv");
        mockFileSystem.addFile(csvFile, "field1,field2\nvalue1,value2");
        return csvFile;
      },
    },
    {
      name: "JSON input",
      prepareFile: () => {
        const jsonFile = path.join(testUtils.fixturesDir, "mapping.json");
        mockFileSystem.addFile(
          jsonFile,
          JSON.stringify({
            mappings: {
              properties: {
                field1: { type: "keyword" },
                field2: { type: "integer" },
              },
            },
          })
        );
        return jsonFile;
      },
    },
  ];

  inputTestCases.forEach(({ name, prepareFile }) => {
    it(`generates mapping from ${name}`, async () => {
      // Prepare test input
      const inputFile = prepareFile();

      // Create command and execute
      const command = new TestMappingCommand();
      const cliOutput = createTestOutput(inputFile);

      const result = await command.testExecute(cliOutput);

      // Assertions
      assert.ok(result, "Command should return a result");
      assert.ok(
        mockFileSystem.exists(path.join(testUtils.outputDir, "mapping.json")),
        `Output mapping file should be created for ${name}`
      );
    });
  });

  it("handles missing input files", async () => {
    const command = new TestMappingCommand();

    const invalidOutput = createTestOutput(
      path.join(testUtils.fixturesDir, "nonexistent.csv"),
      {
        filePaths: [],
      }
    );

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
