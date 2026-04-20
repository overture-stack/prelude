# Loading Data

With the infrastructure configured, it's time to load data into the portal. Conductor is a CLI tool that reads CSV files, loads each row into PostgreSQL (persistent storage), then indexes them into Elasticsearch as structured documents for search.

Conductor runs as a Docker container — no Node.js installation required. A wrapper script at the root of the repository handles the Docker details for you.

:::info
Run all `./conductor` commands from the **root of the `prelude` repository** (i.e. where `docker-compose.yml` lives).
:::

<details>
<summary><strong>Optional: run conductor from any directory</strong></summary>

By default `./conductor` must be called from the repo root. If you'd prefer to run `conductor` from anywhere on your system, add the repo to your shell's `PATH`:

```bash
export PATH="$PATH:/path/to/prelude"
```

Add that line to your `~/.zshrc` (Zsh) or `~/.bashrc` (Bash) and reload:

```bash
source ~/.zshrc   # or source ~/.bashrc
```

You can then run `conductor upload ...` from any directory. The script resolves the `data/` folder relative to its own location in the repo, so paths like `./data/datatable1.csv` still refer to the repo's `data/` directory — run the command from the repo root or use an absolute path to a file outside it.

</details>

### Uploading Data

Run the upload command to load your data:

```bash
./conductor upload -f ./data/datatable1.csv -t datatable1 -i datatable1-index
```

<details>
<summary><strong>Command breakdown</strong></summary>

- `upload`: the Conductor command for the full CSV → PostgreSQL → Elasticsearch pipeline
- `-f ./data/datatable1.csv`: path to the input CSV file (relative to the repo root)
- `-t datatable1`: target PostgreSQL table name (must match the table created by your SQL schema)
- `-i datatable1-index`: target Elasticsearch index name (must match the index created by the setup service)

Additional options:

- `-b, --batch-size <n>`: records per batch (default: `5000`)
- `--delimiter <char>`: CSV delimiter character (default: `,`)
- `--statement-timeout <ms>`: max time allowed per database statement in milliseconds (default: `120000`)

For a full reference run: `./conductor upload -h`

</details>

<details>
<summary><strong>What happens during upload</strong></summary>

Conductor processes each CSV row in two stages. First, it inserts the raw records into the PostgreSQL table (providing persistent, queryable storage). Then it reads from PostgreSQL, wraps each record in a structured JSON document, and bulk-indexes it into Elasticsearch:

```json
{
  "data": {
    "donor_id": "DO-001",
    "gender": "Female",
    "age_at_diagnosis": 45,
    "cancer_type": "Breast Cancer",
    "..."
  },
  "submission_metadata": {
    "submitter_id": "DO-001",
    "processed_at": "2026-04-21T14:30:00.000Z",
    "source_file": "datatable1.csv",
    "record_number": 1
  }
}
```

Your CSV fields go into the `data` object. Conductor adds `submission_metadata` automatically for tracking purposes. Records are inserted into PostgreSQL and indexed into Elasticsearch in batches.

</details>

<details>
<summary><strong>Upload behaviour: re-runs, interruptions, and partial failures</strong></summary>

**Re-uploading the same file:** Re-running `upload` against an already-loaded file is safe. Records that already exist in PostgreSQL are skipped automatically, nothing is duplicated in either PostgreSQL or Elasticsearch.

**If the upload is interrupted:** If the process is stopped (Ctrl+C, network drop, etc.), any records already written to PostgreSQL are preserved. Re-run the same command to resume, previously loaded records are skipped and only the remaining rows are uploaded and indexed.

**If Elasticsearch indexing fails:** Records may be written to PostgreSQL but fail to reach Elasticsearch. If this happens, a warning is printed at the end of the run:

```
Some records were inserted into "<table>" but not indexed. Re-run indexing with:
   conductor index-db -t <table> -i <index>
```

Run `./conductor index-db` to re-index from PostgreSQL without re-parsing the CSV.

</details>

### Verifying the Upload

Open **http://localhost:3000** in your browser:

1. Navigate to the data exploration page
2. Verify records appear in the data table
3. Test the facet filters: click on values in the sidebar and confirm the table updates
4. Try sorting columns

<details>
<summary><strong>Verify directly via Elasticsearch</strong></summary>

Check the document count:

```bash
curl -u elastic:myelasticpassword http://localhost:9200/datatable1_centric/_count?pretty
```

View a sample document:

```bash
curl -u elastic:myelasticpassword "http://localhost:9200/datatable1_centric/_search?pretty&size=1"
```

If you installed Elasticvue, connect to `http://localhost:9200` with credentials `elastic` / `myelasticpassword`, navigate to Indices, and select `datatable1-index` to browse documents and verify the data structure.

</details>

### Reloading Data (supplemental)

The right approach depends on what changed, expand the relevant scenario below for more information.

<details>
<summary><strong>Mapping changed (data already in PostgreSQL)</strong></summary>

If you updated the Elasticsearch mapping but your CSV data is unchanged, use `index-db` to re-index directly from PostgreSQL, no need to re-parse the CSV:

1. Delete the existing index:

   ```bash
   curl -u elastic:myelasticpassword -X DELETE "http://localhost:9200/datatable1-index"
   ```

2. Restart to recreate the index from the updated mapping:

   ```bash
   make restart
   ```

   Windows (PowerShell):

   ```powershell
   .\run.ps1 restart
   ```

3. Re-index from PostgreSQL:

   ```bash
   ./conductor index-db -t datatable1 -i datatable1-index
   ```

</details>

<details>
<summary><strong>CSV corrected (data needs to be re-uploaded)</strong></summary>

If you fixed errors in the CSV itself, you need to clear both PostgreSQL and Elasticsearch. The existing table already contains the old records and re-uploading would cause duplicates:

1. Delete the existing index:

   ```bash
   curl -u elastic:myelasticpassword -X DELETE "http://localhost:9200/datatable1-index"
   ```

2. Truncate the PostgreSQL table:

   ```bash
   docker exec postgres psql -U admin -d overtureDb -c "TRUNCATE TABLE datatable1;"
   ```

3. Restart to recreate the index:

   ```bash
   make restart
   ```

   Windows (PowerShell):

   ```powershell
   .\run.ps1 restart
   ```

4. Re-upload from the corrected CSV:

   ```bash
   ./conductor upload -f ./data/datatable1.csv -t datatable1 -i datatable1-index
   ```

</details>

<details>
<summary><strong>Other Conductor commands</strong></summary>

The standard `upload` command runs the full CSV → PostgreSQL → Elasticsearch pipeline in one pass, which is what you need for the workshop. Conductor also exposes two targeted commands that operate on only one destination, useful when the two stages need to happen separately, for example if PostgreSQL and Elasticsearch are being managed independently, or if you need to debug one layer in isolation:

- **`upload-db`:** loads CSV data into PostgreSQL only, without indexing to Elasticsearch:

  ```bash
  ./conductor upload-db -f ./data/datatable1.csv -t datatable1
  ```

- **`upload-es`:** uploads CSV data directly to Elasticsearch, bypassing PostgreSQL. The index must already exist and the CSV headers must match the index mapping:

  ```bash
  ./conductor upload-es -f ./data/datatable1.csv -i datatable1-index
  ```

For a full list of available commands and options:

```bash
./conductor -h
```

</details>

### Checkpoint

Before proceeding, confirm:

1. `./conductor -h` runs without errors
2. The upload command completed successfully (check terminal output for record count)
3. `curl -u elastic:myelasticpassword http://localhost:9200/datatable1_centric/_count?pretty` returns a count matching your CSV row count
4. The portal at http://localhost:3000 shows data in the table
5. Facet filters work: clicking a value updates the table

> **Stuck?** If the upload fails with a connection error, make sure both PostgreSQL and Elasticsearch are running: `docker exec postgres pg_isready -U admin` and `curl -u elastic:myelasticpassword http://localhost:9200/_cluster/health?pretty`. If the index or table doesn't exist, run `make restart` first.

**Next:** This is the stage where issues are most likely to surface. If something isn't working, that's expected, the next page walks through how to diagnose which layer of the stack has the problem.
