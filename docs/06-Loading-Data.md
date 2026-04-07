# Loading Data

With the infrastructure configured, it's time to load data into the portal. Conductor is a CLI tool that reads CSV files, loads each row into PostgreSQL (persistent storage), then indexes them into Elasticsearch as structured documents for search.

### Installing Conductor

Navigate to the Conductor directory and install it:

```bash
cd apps/conductor
npm install
npm run build
chmod +x dist/main.js
npm install -g .
```

Verify the installation from the project root:

```bash
cd ../..
conductor -h
```

You should see help text listing the available commands, including `upload`.

<details>
<summary>**Alternative:** running Conductor without global installation</summary>

Use this if you don't have permission to install npm packages globally (e.g. on a managed or shared machine), or if you prefer not to modify your global npm environment:

```bash
cd apps/conductor
npm install
npm run build
chmod +x dist/main.js
npm start -- help
```

</details>

<details>
<summary>**Troubleshooting:** conflicting conductor alias</summary>

If `conductor` resolves to an unexpected path, check for an existing alias:

```bash
alias | grep conductor
```

To remove it for the current session:

```bash
unalias conductor
```

To remove it permanently, delete the `alias conductor=...` line from your `~/.bashrc` or `~/.zshrc` and reload:

```bash
source ~/.bashrc  # or source ~/.zshrc
```

</details>

:::info
Run all `conductor` commands from the **root of the `prelude` repository** (i.e. where `docker-compose.yml` lives), unless you are using the alternate path commands which must be run from `apps/conductor/`.
:::

### Uploading Data

Run the upload command to load your data:

```bash
conductor upload -f ./data/datatable1.csv -t datatable1 -i datatable1-index
```

<details>
<summary>**Command breakdown**</summary>

- `upload`: the Conductor command for the full CSV → PostgreSQL → Elasticsearch pipeline
- `-f ./data/datatable1.csv`: path to the input CSV file
- `-t datatable1`: target PostgreSQL table name (must match the table created by your SQL schema)
- `-i datatable1-index`: target Elasticsearch index name (must match the index created by the setup service)

Additional options:

- `-b, --batch-size <n>`: records per batch (default: `5000`)
- `--delimiter <char>`: CSV delimiter character (default: `,`)
- `--statement-timeout <ms>`: max time allowed per database statement in milliseconds (default: `120000`)
- `--db-host <host:port>`: PostgreSQL connection (default: `localhost:5435`)
- `--db-name <name>`: database name (default: `overtureDb`)
- `--db-user <username>`: database username (default: `admin`)
- `--db-pass <password>`: database password (default: `admin123`)
- `--es-host <host:port>`: Elasticsearch connection (default: `localhost:9200`)
- `--es-user <username>`: Elasticsearch username (default: `elastic`)
- `--es-pass <password>`: Elasticsearch password (default: `myelasticpassword`)

**Alternate path (no global install):**

```bash
cd apps/conductor && npm start -- upload -f ../../data/datatable1.csv -t datatable1 -i datatable1-index
```

For a full reference run: `conductor upload -h`

</details>

<details>
<summary>**What happens during upload**</summary>

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
<summary>**Upload behaviour: re-runs, interruptions, and partial failures**</summary>

**Re-uploading the same file:** Re-running `upload` against an already-loaded file is safe. Records that already exist in PostgreSQL are skipped automatically, nothing is duplicated in either PostgreSQL or Elasticsearch.

**If the upload is interrupted:** If the process is stopped (Ctrl+C, network drop, etc.), any records already written to PostgreSQL are preserved. Re-run the same command to resume, previously loaded records are skipped and only the remaining rows are uploaded and indexed.

**If Elasticsearch indexing fails:** Records may be written to PostgreSQL but fail to reach Elasticsearch. If this happens, a warning is printed at the end of the run:

```
Some records were inserted into "<table>" but not indexed. Re-run indexing with:
   conductor index-db -t <table> -i <index>
```

Run `conductor index-db` to re-index from PostgreSQL without re-parsing the CSV.

</details>

### Verifying the Upload

Open **http://localhost:3000** in your browser:

1. Navigate to the data exploration page
2. Verify records appear in the data table
3. Test the facet filters: click on values in the sidebar and confirm the table updates
4. Try sorting columns

<details>
<summary>**Verify directly via Elasticsearch**</summary>

Check the document count:

```bash
curl -u elastic:myelasticpassword http://localhost:9200/datatable1_centric/_count?pretty
```

View a sample document:

```bash
curl -u elastic:myelasticpassword "http://localhost:9200/datatable1_centric/_search?pretty&size=1"
```

:::tip
If you installed Elasticvue, connect to `http://localhost:9200` with credentials `elastic` / `myelasticpassword`, navigate to Indices, and select `datatable1-index` to browse documents and verify the data structure.
:::

</details>

### Reloading Data (supplemental)

The right approach depends on what changed, expand the relevant scenario below for more information.

<details>
<summary>**Mapping changed (data already in PostgreSQL)**</summary>

If you updated the Elasticsearch mapping but your CSV data is unchanged, use `index-db` to re-index directly from PostgreSQL, no need to re-parse the CSV:

1. Delete the existing index:

   ```bash
   curl -u elastic:myelasticpassword -X DELETE "http://localhost:9200/datatable1-index"
   ```

2. Restart to recreate the index from the updated mapping:

   ```bash
   make restart
   ```

3. Re-index from PostgreSQL:

   ```bash
   conductor index-db -t datatable1 -i datatable1-index
   ```

</details>

<details>
<summary>**CSV corrected (data needs to be re-uploaded)**</summary>

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

4. Re-upload from the corrected CSV:

   ```bash
   conductor upload -f ./data/datatable1.csv -t datatable1 -i datatable1-index
   ```

</details>

<details>
<summary>**Other Conductor commands**</summary>

The standard `upload` command runs the full CSV → PostgreSQL → Elasticsearch pipeline in one pass, which is what you need for the workshop. Conductor also exposes two targeted commands that operate on only one destination, useful when the two stages need to happen separately, for example if PostgreSQL and Elasticsearch are being managed independently, or if you need to debug one layer in isolation:

- **`upload-db`:** loads CSV data into PostgreSQL only, without indexing to Elasticsearch:

  ```bash
  conductor upload-db -f ./data/datatable1.csv -t datatable1
  ```

- **`upload-es`:** uploads CSV data directly to Elasticsearch, bypassing PostgreSQL. The index must already exist and the CSV headers must match the index mapping:

  ```bash
  conductor upload-es -f ./data/datatable1.csv -i datatable1-index
  ```

</details>

### Checkpoint

Before proceeding, confirm:

- [ ] `conductor -h` runs without errors
- [ ] The upload command completed successfully (check terminal output for record count)
- [ ] `curl -u elastic:myelasticpassword http://localhost:9200/datatable1_centric/_count?pretty` returns a count matching your CSV row count
- [ ] The portal at http://localhost:3000 shows data in the table
- [ ] Facet filters work: clicking a value updates the table

> **Stuck?** If the upload fails with a connection error, make sure both PostgreSQL and Elasticsearch are running: `docker exec postgres pg_isready -U admin` and `curl -u elastic:myelasticpassword http://localhost:9200/_cluster/health?pretty`. If the index or table doesn't exist, run `make restart` first.

**Next:** This is the stage where issues are most likely to surface. If something isn't working, that's expected, the next page walks through how to diagnose which layer of the stack has the problem.
