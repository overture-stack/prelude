import { createHash } from 'crypto';
import { parseCsv } from '../configGenerator/csvParser';
import { createPgPool, createEsClient } from './clients';

// ─── Types ────────────────────────────────────────────────────────────────────

export type SubmissionResult = {
	total: number;
	inserted: number;
	skipped: number;
	indexed: number;
	errors: SubmissionError[];
	log: string[];
};

export type SubmissionError = {
	stage: 'validation' | 'postgres' | 'elasticsearch';
	message: string;
	detail?: string;
};

type PgRow = Record<string, unknown>;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generateSubmissionId(record: Record<string, string | null>): string {
	const keys = Object.keys(record).sort();
	const sorted = keys.reduce(
		(acc, key) => {
			acc[key] = record[key];
			return acc;
		},
		{} as Record<string, unknown>,
	);
	return createHash('sha256').update(JSON.stringify(sorted)).digest('hex');
}

function pgRowToEsDoc(row: PgRow): Record<string, unknown> {
	let metadata: Record<string, unknown>;
	try {
		metadata = typeof row.submission_metadata === 'string' ? JSON.parse(row.submission_metadata) : (row.submission_metadata as Record<string, unknown>);
	} catch {
		metadata = {};
	}
	const { submission_metadata: _m, ...dataColumns } = row;
	return { _id: metadata.submission_id, submission_metadata: metadata, data: dataColumns };
}

// ─── Validation ───────────────────────────────────────────────────────────────

async function getTableColumns(tableName: string): Promise<string[]> {
	const pool = createPgPool();
	try {
		const result = await pool.query(
			`SELECT column_name FROM information_schema.columns
			 WHERE table_schema = 'public' AND table_name = $1
			 ORDER BY ordinal_position`,
			[tableName],
		);
		if (result.rows.length === 0) {
			throw new Error(`Table "${tableName}" does not exist`);
		}
		return result.rows.map((r: { column_name: string }) => r.column_name);
	} finally {
		await pool.end();
	}
}

async function checkEsIndexExists(indexName: string): Promise<void> {
	const client = createEsClient();
	const { body: exists } = await client.indices.exists({ index: indexName });
	if (!exists) {
		throw new Error(`Elasticsearch index "${indexName}" does not exist`);
	}
}

export async function validateTargets(
	tableName: string,
	indexName: string,
): Promise<{ tableColumns: string[]; errors: SubmissionError[] }> {
	const errors: SubmissionError[] = [];
	let tableColumns: string[] = [];

	await Promise.all([
		getTableColumns(tableName)
			.then((cols) => {
				tableColumns = cols;
			})
			.catch((err: Error) => {
				errors.push({ stage: 'validation', message: err.message });
			}),
		checkEsIndexExists(indexName).catch((err: Error) => {
			errors.push({ stage: 'validation', message: err.message });
		}),
	]);

	return { tableColumns, errors };
}

// ─── Postgres bulk insert ─────────────────────────────────────────────────────

const PG_MAX_PARAMS = 65535;

async function bulkInsertPg(
	tableName: string,
	headers: string[],
	records: PgRow[],
): Promise<{ insertedRows: PgRow[]; skipped: number }> {
	const pool = createPgPool();
	const allInserted: PgRow[] = [];
	let totalSkipped = 0;

	const maxRowsPerQuery = Math.max(1, Math.floor(PG_MAX_PARAMS / headers.length));

	for (let offset = 0; offset < records.length; offset += maxRowsPerQuery) {
		const chunk = records.slice(offset, offset + maxRowsPerQuery);

		const placeholders = chunk
			.map((_, ri) => `(${headers.map((_, ci) => `$${ri * headers.length + ci + 1}`).join(', ')})`)
			.join(', ');

		const values: unknown[] = [];
		for (const rec of chunk) {
			for (const h of headers) {
				const v = rec[h];
				values.push(v == null || v === '' ? null : v);
			}
		}

		const conflictClause = headers.includes('submission_metadata')
			? `ON CONFLICT ((submission_metadata->>'submission_id')) DO NOTHING`
			: '';

		const sql = `
			INSERT INTO ${tableName} (${headers.map((h) => `"${h}"`).join(', ')})
			VALUES ${placeholders}
			${conflictClause}
			RETURNING *
		`;

		const client = await pool.connect();
		try {
			await client.query('BEGIN');
			const result = await client.query(sql, values);
			await client.query('COMMIT');
			allInserted.push(...result.rows);
			totalSkipped += chunk.length - result.rows.length;
		} catch (err) {
			await client.query('ROLLBACK').catch(() => {});
			await pool.end();
			throw err;
		} finally {
			client.release();
		}
	}

	await pool.end();
	return { insertedRows: allInserted, skipped: totalSkipped };
}

// ─── Elasticsearch bulk index ─────────────────────────────────────────────────

type EsErrorEntry = { id: string; type: string; reason: string };

async function bulkIndexEs(indexName: string, docs: Record<string, unknown>[]): Promise<{ indexed: number; errors: EsErrorEntry[] }> {
	const client = createEsClient();

	const body: Record<string, unknown>[] = [];
	for (const doc of docs) {
		const { _id, ...docBody } = doc;
		body.push(_id ? { index: { _index: indexName, _id: String(_id) } } : { index: { _index: indexName } });
		body.push(docBody);
	}

	const { body: result } = await client.bulk({ body, refresh: true });

	let indexed = 0;
	const errors: EsErrorEntry[] = [];

	for (const item of result.items as Array<{ index?: { _id?: string; result?: string; error?: { type: string; reason: string } } }>) {
		if (item.index?.error) {
			errors.push({
				id: item.index._id ?? 'unknown',
				type: item.index.error.type,
				reason: item.index.error.reason,
			});
		} else {
			indexed++;
		}
	}

	return { indexed, errors };
}

// ─── Main pipeline ────────────────────────────────────────────────────────────

export async function submitCsv({
	csvContent,
	tableName,
	indexName,
	delimiter = ',',
	filename = 'upload.csv',
}: {
	csvContent: string;
	tableName: string;
	indexName: string;
	delimiter?: string;
	filename?: string;
}): Promise<SubmissionResult> {
	const errors: SubmissionError[] = [];
	const log: string[] = [];
	const startTime = Date.now();
	const ts = () => `[${((Date.now() - startTime) / 1000).toFixed(2)}s]`;

	const info = (msg: string) => log.push(`${ts()} INFO  ${msg}`);
	const ok = (msg: string) => log.push(`${ts()} OK    ${msg}`);
	const warn = (msg: string) => log.push(`${ts()} WARN  ${msg}`);
	const fail = (msg: string) => log.push(`${ts()} ERROR ${msg}`);

	const done = (result: Omit<SubmissionResult, 'log'>): SubmissionResult => {
		log.push(`${ts()} DONE  Finished in ${((Date.now() - startTime) / 1000).toFixed(2)}s`);
		return { ...result, log };
	};

	// Parse CSV
	info(`Parsing CSV (file: ${filename}, delimiter: "${delimiter === '\t' ? '\\t' : delimiter}")`);
	const csv = parseCsv(csvContent, delimiter);
	if (csv.headers.length === 0) {
		fail('Could not parse CSV headers');
		return done({ total: 0, inserted: 0, skipped: 0, indexed: 0, errors: [{ stage: 'validation', message: 'Could not parse CSV headers' }] });
	}
	ok(`Parsed ${csv.rows.length} data rows, ${csv.headers.length} columns: ${csv.headers.join(', ')}`);

	// Validate targets
	info(`Validating PostgreSQL table "${tableName}"...`);
	info(`Validating Elasticsearch index "${indexName}"...`);
	const { tableColumns, errors: validationErrors } = await validateTargets(tableName, indexName);
	if (validationErrors.length > 0) {
		for (const e of validationErrors) {
			fail(e.message);
		}
		return done({ total: 0, inserted: 0, skipped: 0, indexed: 0, errors: validationErrors });
	}
	ok(`PostgreSQL table "${tableName}" exists (${tableColumns.length} columns)`);
	ok(`Elasticsearch index "${indexName}" exists`);

	// Validate CSV headers against table columns
	info('Validating CSV headers against table schema...');
	const dataColumns = tableColumns.filter((c) => c !== 'submission_metadata' && c !== 'id');
	const missingHeaders = dataColumns.filter((c) => !csv.headers.includes(c));
	const extraHeaders = csv.headers.filter((h) => !tableColumns.includes(h));
	if (missingHeaders.length > 0 || extraHeaders.length > 0) {
		const parts: string[] = [];
		if (missingHeaders.length > 0) {
			fail(`Missing columns (required by table): ${missingHeaders.join(', ')}`);
			parts.push(`Missing columns: ${missingHeaders.join(', ')}`);
		}
		if (extraHeaders.length > 0) {
			fail(`Extra columns (not in table): ${extraHeaders.join(', ')}`);
			parts.push(`Extra columns not in table: ${extraHeaders.join(', ')}`);
		}
		info(`Table expects: ${dataColumns.join(', ')}`);
		return done({ total: 0, inserted: 0, skipped: 0, indexed: 0, errors: [{ stage: 'validation', message: parts.join(' | '), detail: `Table expects: ${dataColumns.join(', ')}` }] });
	}
	ok(`All ${csv.headers.length} CSV headers match table schema`);

	const total = csv.rows.length;
	if (total === 0) {
		fail('CSV has no data rows');
		return done({ total: 0, inserted: 0, skipped: 0, indexed: 0, errors: [{ stage: 'validation', message: 'CSV has no data rows' }] });
	}

	// Build PG records with submission_metadata
	info(`Generating deterministic submission IDs (SHA-256) for ${total} records...`);
	const pgHeaders = [...csv.headers, 'submission_metadata'];
	const pgRecords: PgRow[] = csv.rows.map((row) => {
		const dataRecord = Object.fromEntries(csv.headers.map((h, i) => [h, row[i] || null])) as Record<string, string | null>;
		const submissionId = generateSubmissionId(dataRecord);
		const metadata = {
			submission_id: submissionId,
			source_file_name: filename,
			processed_at: new Date().toISOString(),
		};
		return { ...dataRecord, submission_metadata: JSON.stringify(metadata) };
	});
	ok(`Submission IDs generated`);

	// Insert to PostgreSQL
	info(`Inserting ${total} records into PostgreSQL table "${tableName}"...`);
	let insertedRows: PgRow[] = [];
	let skipped = 0;
	try {
		({ insertedRows, skipped } = await bulkInsertPg(tableName, pgHeaders, pgRecords));
	} catch (err: unknown) {
		const msg = err instanceof Error ? err.message : String(err);
		fail(`PostgreSQL insert failed: ${msg}`);
		errors.push({ stage: 'postgres', message: `PostgreSQL insert failed: ${msg}` });
		return done({ total, inserted: 0, skipped: 0, indexed: 0, errors });
	}

	const inserted = insertedRows.length;
	ok(`PostgreSQL: ${inserted} inserted, ${skipped} skipped (duplicates)`);

	if (inserted === 0) {
		warn('All records already exist — nothing new to index');
		return done({ total, inserted: 0, skipped, indexed: 0, errors });
	}

	// Transform PG rows to ES docs and index
	info(`Indexing ${inserted} documents into Elasticsearch index "${indexName}"...`);
	const esDocs = insertedRows.map(pgRowToEsDoc);
	let indexed = 0;
	try {
		const esResult = await bulkIndexEs(indexName, esDocs);
		indexed = esResult.indexed;
		if (esResult.errors.length > 0) {
			warn(`Elasticsearch rejected ${esResult.errors.length} document(s)`);
			for (const e of esResult.errors) {
				fail(`  Doc ${e.id}: ${e.type} — ${e.reason}`);
				errors.push({ stage: 'elasticsearch', message: `${e.type}: ${e.reason}`, detail: `Document ID: ${e.id}` });
			}
		}
		ok(`Elasticsearch: ${indexed} documents indexed`);
	} catch (err: unknown) {
		const msg = err instanceof Error ? err.message : String(err);
		fail(`Elasticsearch indexing failed: ${msg}`);
		errors.push({ stage: 'elasticsearch', message: `Elasticsearch indexing failed: ${msg}` });
	}

	return done({ total, inserted, skipped, indexed, errors });
}
