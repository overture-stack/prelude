// Type inference logic ported from apps/composer — pure functions, no filesystem I/O.

const BOOLEAN_VALUES = new Set(['true', 'false', 'yes', 'no', '0', '1']);
const DATE_PATTERNS = [
	/^\d{4}-\d{2}-\d{2}$/,
	/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
	/^\d{2}\/\d{2}\/\d{4}$/,
];

function isBoolean(value: string): boolean {
	return BOOLEAN_VALUES.has(value.toLowerCase());
}

function isDate(value: string): boolean {
	return DATE_PATTERNS.some((p) => p.test(value)) && !isNaN(Date.parse(value));
}

function isInteger(value: string): boolean {
	if (value === '') return false;
	const n = Number(value);
	return !isNaN(n) && Number.isInteger(n);
}

function isFloat(value: string): boolean {
	if (value === '') return false;
	const n = Number(value);
	return !isNaN(n) && !Number.isInteger(n);
}

// ── Elasticsearch ─────────────────────────────────────────────────────────────

export type EsFieldType = 'keyword' | 'text' | 'integer' | 'float' | 'boolean' | 'date';

export function inferEsType(header: string, sample: string): EsFieldType {
	const v = (sample ?? '').trim();
	if (v === '') return 'keyword';
	if (isBoolean(v)) return 'boolean';
	if (isDate(v)) return 'date';
	if (isInteger(v)) return 'integer';
	if (isFloat(v)) return 'float';
	if (v.length > 255) return 'text';
	return 'keyword';
}

// ── PostgreSQL ────────────────────────────────────────────────────────────────

export type PgColumnType = 'BOOLEAN' | 'SMALLINT' | 'INTEGER' | 'BIGINT' | 'DECIMAL' | 'DATE' | 'TIMESTAMP' | string;

export function inferPgType(values: string[]): PgColumnType {
	const nonEmpty = values.filter((v) => v.trim() !== '');
	if (nonEmpty.length === 0) return 'VARCHAR(255)';

	// Boolean
	const unique = new Set(nonEmpty.map((v) => v.toLowerCase()));
	if (unique.size <= 2 && [...unique].every((v) => BOOLEAN_VALUES.has(v))) return 'BOOLEAN';

	// Timestamp / date
	const allDates = nonEmpty.every((v) => isDate(v));
	if (allDates) {
		const hasTime = nonEmpty.some((v) => v.includes('T') || v.includes(' '));
		return hasTime ? 'TIMESTAMP' : 'DATE';
	}

	// Numeric
	const allNumeric = nonEmpty.every((v) => !isNaN(Number(v)));
	if (allNumeric) {
		const allInts = nonEmpty.every((v) => Number.isInteger(Number(v)));
		if (allInts) {
			const max = Math.max(...nonEmpty.map(Number));
			const min = Math.min(...nonEmpty.map(Number));
			if (min >= -32768 && max <= 32767) return 'SMALLINT';
			if (min >= -2147483648 && max <= 2147483647) return 'INTEGER';
			return 'BIGINT';
		}
		return 'DECIMAL(10,4)';
	}

	// String
	const maxLen = Math.max(...nonEmpty.map((v) => v.length));
	if (maxLen > 255) return 'TEXT';
	return `VARCHAR(${Math.max(50, Math.ceil(maxLen * 1.5))})`;
}
