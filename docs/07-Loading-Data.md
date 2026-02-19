# Loading Data

With the infrastructure configured, it's time to load data into the portal. Conductor is a CLI tool that reads CSV files, loads each row into PostgreSQL (persistent storage), then indexes them into Elasticsearch as structured documents for search.

## Installing Conductor

Navigate to the Conductor directory and install it:

```bash
cd apps/conductor
npm install
npm run build
npm install -g .
```

Verify the installation from the project root:

```bash
cd ../..
conductor -h
```

You should see help text listing the available commands, including `upload`.

<details>
<summary>Alternative: running Conductor without global installation</summary>

Use this if you don't have permission to install npm packages globally (e.g. on a managed or shared machine), or if you prefer not to modify your global npm environment:

```bash
cd apps/conductor
npm install
npm run build
npm start -- help
```

</details>

## Uploading Data

> **Before uploading:** If your CSV contains date fields, ensure all values are normalised to ISO 8601 format (`YYYY-MM-DD` or `YYYY-MM-DDTHH:mm:ssZ`). Elasticsearch is strict about date formats — mixed formats or timezone offsets will cause indexing to fail. If in doubt, check the field type in your mapping; leaving it as `keyword` avoids errors at the cost of date-range filtering. See [05-Generating-Configurations.md](05-Generating-Configurations.md#adjusting-the-mapping) for more detail.

Run the upload command to load your data:

```bash
conductor upload -f ./data/datatable1.csv -t datatable1 -i datatable1-index
```

<details>
<summary>Command breakdown</summary>

- `upload`: the Conductor command for the full CSV → PostgreSQL → Elasticsearch pipeline
- `-f ./data/datatable1.csv`: path to the input CSV file
- `-t datatable1`: target PostgreSQL table name (must match the table created by your SQL schema)
- `-i datatable1-index`: target Elasticsearch index name (must match the index created by the setup service)

Additional options:

- `-b, --batch-size <n>`: records per batch (default: `1000`)
- `--db-host <host:port>`: PostgreSQL connection (default: `localhost:5435`)
- `--db-name <name>`: Database name (default: overtureDb)
- `--db-user <username>`: Database username (default: `admin`)
- `--db-pass <password>`: Database password (default: `admin123`)
- `--es-host <host:port>`: Elasticsearch connection (default: `localhost:9200`)
- `--es-user <username>`: Elasticsearch username (default: `elastic`)
- `--es-pass <password>`: Elasticsearch password (default: `myelasticpassword`)

Full reference: `conductor upload -h`

</details>

### What Happens During Upload

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

Your CSV fields go into the `data` object. Conductor adds `submission_metadata` automatically for tracking purposes. Records are inserted into PostgreSQL and then indexed into Elasticsearch in batches.

## Verifying the Upload

### 1. Check Conductor Output

The terminal output will show:

- Number of records processed
- Batch upload progress
- Any errors encountered
- Final success/failure status

### 2. Query Elasticsearch Directly

Check the document count:

```bash
curl -u elastic:myelasticpassword http://localhost:9200/datatable1_centric/_count?pretty
```

View a sample document:

```bash
curl -u elastic:myelasticpassword "http://localhost:9200/datatable1_centric/_search?pretty&size=1"
```

### 3. Use Elasticvue (Optional)

If you installed Elasticvue:

1. Connect to `http://localhost:9200` with credentials `elastic` / `myelasticpassword`
2. Navigate to Indices → select `datatable1-index`
3. Browse documents to verify the data structure and content

### 4. Check the Portal

Open **http://localhost:3000** in your browser:

1. Navigate to the data exploration page
2. Verify records appear in the data table
3. Test the facet filters: click on values in the sidebar and confirm the table updates
4. Try sorting columns
5. If downloads are enabled, test exporting a filtered subset

> **ILLUSTRATION NEEDED:** A screenshot of the portal showing the data table populated with the demo data, with some facet filters applied showing filtered results. This confirms to participants that the end-to-end pipeline is working.

## Reloading Data

The right approach depends on what changed:

### Mapping changed (data already in PostgreSQL)

If you updated the Elasticsearch mapping but your CSV data is unchanged, use `indexDb` to re-index directly from PostgreSQL, no need to re-parse the CSV:

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
   conductor indexDb -t datatable1 -i datatable1-index
   ```

### CSV corrected (data needs to be re-uploaded)

If you fixed errors in the CSV itself, you need to clear both PostgreSQL and Elasticsearch — the existing table already contains the old records and re-uploading would cause duplicates:

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

## Checkpoint

Before proceeding, confirm:

- [ ] `conductor -h` runs without errors
- [ ] The upload command completed successfully (check terminal output for record count)
- [ ] `curl -u elastic:myelasticpassword http://localhost:9200/datatable1_centric/_count?pretty` returns a count matching your CSV row count
- [ ] The portal at http://localhost:3000 shows data in the table
- [ ] Facet filters work: clicking a value updates the table

> **Stuck?** If the upload fails with a connection error, make sure both PostgreSQL and Elasticsearch are running: `docker exec postgres pg_isready -U admin` and `curl -u elastic:myelasticpassword http://localhost:9200/_cluster/health?pretty`. If the index or table doesn't exist, run `make restart` first.

> **Next:** Optionally, customize the portal's appearance and add multiple data tables.
