# Conductor CLI Tests

This directory contains automated tests for the Conductor CLI tool, focused on ensuring proper error handling without duplicated error messages.

## Running Tests

To run the tests, use one of the following commands from the project root:

```bash
# Run tests once
npm test

# Run tests and watch for changes
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## Test Structure

The tests are organized into the following categories:

1. **File Format Tests** - Tests how the CLI handles different CSV formats
2. **Configuration Options** - Tests CLI options like index name, batch size, etc.
3. **Error Cases** - Tests common error scenarios to ensure correct error handling
4. **Help Command** - Tests that help information is correctly displayed

## Test Focus

These tests are primarily focused on verifying that error messages are not duplicated (e.g., no "✗ Error ✗ Error" patterns). Each test checks for:

1. Absence of duplicated error prefixes
2. Appropriate exit codes (0 for success, non-zero for errors)
3. Presence of relevant error messages

## Test Fixtures

The test fixtures are located in `src/__fixtures__/` and include:

- **valid.csv** - Well-formed CSV with proper headers
- **malformed.csv** - CSV with formatting issues
- **semicolon.csv** - CSV using semicolons as delimiters
- **empty.csv** - Empty file
- **headers_only.csv** - File with only headers, no data rows
- **invalid_headers.csv** - File with headers that don't match expected schema
- **invalid.txt** - Non-CSV file for testing extension validation

## Adding New Tests

To add new tests:

1. Add any required fixture files to `src/__fixtures__/`
2. Add new test cases to `conductor.test.ts`
3. Run the tests to ensure they pass

## Important Notes

- These tests use `ts-node` to run the TypeScript source directly.
- The main focus is on error handling and making sure error messages aren't duplicated.
- Some tests may fail due to connection issues with Elasticsearch - these can be skipped or mocked if needed.
