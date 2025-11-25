# Uploading Data

# Conductor Upload Command

Conductors upload command performs the complete data pipeline: CSV → PostgreSQL → Elasticsearch

```bash
conductor upload -f ./data/sample.csv -t my_table -i my-index
```

<details>
<summary>Command Options</summary>

**Key Options:**

- `-f, --file <files...>` - Input CSV files to process
- `-t, --table <name>` - PostgreSQL table name (default: "data")
- `-i, --index <name>` - Elasticsearch index name (default: "data")
- `-b, --batch-size <size>` - Batch size for operations (default: 1000)
- `--delimiter <char>` - CSV delimiter character (default: ",")

**Database Options:**

- `--db-host <host>` - PostgreSQL host:port (default: "localhost:5435")
- `--db-name <name>` - PostgreSQL database name (default: "overtureDb")
- `--db-user <user>` - PostgreSQL username (default: "admin")
- `--db-pass <password>` - PostgreSQL password (default: "admin123")

**Elasticsearch Options:**

- `--es-host <host>` - Elasticsearch host:port (default: "localhost:9200")
- `--es-user <username>` - Elasticsearch username (default: "elastic")
- `--es-pass <password>` - Elasticsearch password (default: "myelasticpassword")

</details>

## Portal Reference Table

| Datasets    | PostgreSQL Tables | Elasticsearch Index Alias's |
| ----------- | ----------------- | --------------------------- |
| Correlation | `correlation`     | `correlation-index`         |
| Expression  | `expression`      | `expression-index`          |
| Mutation    | `mutation`        | `mutation-index`            |
| Protein     | `protein`         | `protein-index`             |

### Notes

- **PostgreSQL Table**: Use this name when uploading data with Conductor (`-t` flag)
- **Elasticsearch Index Alias**: Use this name in Arranger `base.json` and for queries
- Index patterns follow the format: `{dataset}-*` (e.g., `correlation-*`)
- Configuration files are located in `configs/elasticsearchConfigs/` and `configs/arrangerConfigs/`

## Installing Conductor

Since Conductor is located in the `apps/conductor` directory of the Prelude repo, you can install it locally from that directory:

1. Build the Conductor CLI:

   ```bash
   cd apps/conductor
   npm install
   npm run build
   chmod +x dist/main.js
   cd ../..
   ```

2. Make the wrapper script executable:

   ```bash
   chmod +x conductor.sh
   ```

3. Add the project directory to your PATH:

   ```bash
   echo "export PATH=\"$(pwd):\$PATH\"" >> ~/.bashrc
   source ~/.bashrc
   ```

   > **Note:** If using zsh, replace `~/.bashrc` with `~/.zshrc`. If the utility has been pre-built for you, you only need to run this step.

4. **Validation:** Run `conductor -h` to verify installation. You should see help text outlining the available commands.
