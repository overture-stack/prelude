### Test Commands Using Fixture Files

#### 1. Basic Test Command

```bash
conductor setupIndices \
  --url "http://localhost:9200" \
  --user "elastic" \
  --password "changeme" \
  -t "./src/__fixtures__/indexSetup/mapping.json" \
  -n "tabular_template" \
  -i "tabular_data" \
  -a "tabular"
```

#### 2. Using Config File from Fixtures

```bash
conductor setupIndices --config "./src/__fixtures__/indexSetup/es-config.json"
```

#### 3. Test with Debug Output

```bash
conductor setupIndices \
  --url "http://localhost:9200" \
  -t "./src/__fixtures__/indexSetup/mapping.json" \
  -n "tabular_template" \
  -i "tabular_data" \
  --debug
```

#### 4. Test with Minimal Options (showing required fields)

```bash
conductor setupIndices \
  --url "http://localhost:9200" \
  -t "./src/__fixtures__/indexSetup/mapping.json" \
  -n "tabular_template" \
  -i "tabular_data"
```

These commands use the actual fixture paths in your project structure, making them ready to use for testing your implementation of the `setupIndices` command.
