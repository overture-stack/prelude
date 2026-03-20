# Conductor Deduplication Design

## The Problem

When `conductor upload` is run multiple times with the same CSV file, two separate accumulation issues compound each other:

1. **PostgreSQL** appends all rows on every upload — the same 21 rows become 42, then 63, and so on.
2. **Elasticsearch** re-indexes the entire table on every run and, because each document was assigned a random ID, creates entirely new documents rather than overwriting existing ones.

After 6 uploads of a 21-row file the result is:
- PostgreSQL: **126 rows** (6 × 21, correct if intentional — but likely not)
- Elasticsearch: **441 documents** (21 + 42 + 63 + 84 + 105 + 126, clearly wrong)

---

## Root Cause

### PostgreSQL — no deduplication on insert

The bulk insert used a plain `INSERT INTO ... VALUES ...` with no conflict handling. Every row was inserted unconditionally regardless of whether identical data already existed.

### Elasticsearch — auto-generated document IDs

Elasticsearch only upserts (overwrites) a document when it receives the **same `_id`** as an existing one. Previously, no `_id` was set on documents being indexed, so Elasticsearch auto-generated a new random ID for each document on every run. The index grew with every re-index.

### The underlying cause of both: random `submission_id`

At the heart of both issues was `createRecordMetadata()` in `metadata.ts`, which generated a fresh `uuidv4()` for every record on every run. Because the ID changed each time, there was no stable identifier to key deduplication off in either system.

---

## The Solution

### 1. Deterministic `submission_id` (content hash)

`submission_id` is now generated as a **SHA-256 hash of the row's data columns** rather than a random UUID.

```
submission_id = SHA-256(sorted JSON of data columns)
```

The hash is computed from the data columns only — `submission_metadata` itself is excluded to avoid a circular dependency. Sorting the keys before hashing ensures column ordering in the object does not affect the result.

**Effect:** The same row of data always produces the same `submission_id`, across any number of uploads and re-indexes.

### 2. PostgreSQL — `ON CONFLICT DO NOTHING`

The bulk INSERT statement now appends:

```sql
ON CONFLICT ((submission_metadata->>'submission_id')) DO NOTHING
```

When a row arrives whose `submission_id` hash already exists in the table, PostgreSQL skips it silently. No rows are read or compared — the database resolves the conflict using the unique index (see below), which is an O(log n) index lookup regardless of table size. This approach scales to hundreds of millions of records.

The conflict clause is only added when `submission_metadata` is present in the insert headers, so tables without metadata are unaffected.

### 3. PostgreSQL — unique index on `submission_id`

All four table schemas now define a **unique functional index** on the `submission_id` field extracted from the `submission_metadata` JSONB column:

```sql
CREATE UNIQUE INDEX idx_<table>_submission_id
ON <table> ((submission_metadata->>'submission_id'));
```

This index is what makes `ON CONFLICT` work — PostgreSQL requires a unique constraint or unique index to enforce conflict detection. The `DROP INDEX IF EXISTS` before each `CREATE` handles existing deployments where a non-unique version of the index was previously created.

### 4. Elasticsearch — stable document `_id`

When building Elasticsearch documents during indexing, the `submission_id` from `submission_metadata` is now surfaced as the document's `_id`:

```
{ _id: metadata.submission_id, submission_metadata: {...}, data: {...} }
```

The existing bulk write function already supports `_id`-based upserts — if a document with that `_id` exists, it is overwritten; if not, it is created. Re-indexing the full table is now fully **idempotent**: the same postgres row always produces the same ES document ID, so running `conductor upload` six times with the same file results in exactly 21 documents in Elasticsearch, not 441.

---

## Data Flow After These Changes

```
CSV file
   │
   ▼
Hash each row's data columns → deterministic submission_id
   │
   ▼
INSERT INTO postgres ON CONFLICT (submission_id) DO NOTHING
   │   (duplicate rows silently skipped via unique index)
   ▼
SELECT all rows from postgres table
   │
   ▼
Build ES document { _id: submission_id, ... }
   │
   ▼
Bulk index to Elasticsearch (upsert by _id)
   │   (same row overwrites existing document, no duplicate)
   ▼
ES document count == postgres row count ✓
```

---

## Files Changed

| File | Change |
|------|--------|
| `src/services/csvProcessor/metadata.ts` | `submission_id` is now SHA-256 hash of record data; accepts optional `recordData` parameter |
| `src/services/csvProcessor/postgresProcessor.ts` | Passes data record into `createRecordMetadata` for hashing |
| `src/services/postgresql/bulk.ts` | Adds `ON CONFLICT ((submission_metadata->>'submission_id')) DO NOTHING` to INSERT |
| `src/commands/postgresIndexCommand.ts` | Sets `_id: metadata.submission_id` on each ES document |
| `apps/setup/configs/postgresConfigs/correlation.sql` | Non-unique index replaced with `UNIQUE INDEX` |
| `apps/setup/configs/postgresConfigs/mutation.sql` | `UNIQUE INDEX` on `submission_id` added |
| `apps/setup/configs/postgresConfigs/expression.sql` | `UNIQUE INDEX` on `submission_id` added |
| `apps/setup/configs/postgresConfigs/protein.sql` | `UNIQUE INDEX` on `submission_id` added |

---

## Applying to Existing Deployments

The SQL schema changes take effect automatically on the next platform deployment. To apply them to a currently running environment without a full redeploy, exec into the postgres container and run the relevant SQL file manually:

```bash
docker exec -i postgres-platform psql -U admin -d overtureDb < apps/setup/configs/postgresConfigs/correlation.sql
```

> **Note:** Rows already in postgres from previous duplicate uploads will remain. Only new uploads will deduplicate going forward. To reset to a clean state, truncate the affected tables and re-upload.
