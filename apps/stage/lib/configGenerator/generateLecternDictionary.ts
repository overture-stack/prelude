// Browser-safe port of composer's Lectern dictionary generation logic.
// No filesystem, path, or logger dependencies.

import { ParsedCsv } from './csvParser';

type ValueType = 'string' | 'integer' | 'number' | 'boolean';

interface LecternField {
	name: string;
	description: string;
	valueType: ValueType;
	meta: { displayName: string };
}

interface LecternSchema {
	name: string;
	description: string;
	fields: LecternField[];
}

export interface LecternDictionary {
	name: string;
	version: string;
	description: string;
	schemas: LecternSchema[];
}

function inferValueType(header: string, sample: string): ValueType {
	const v = (sample ?? '').trim();
	if (!v) return 'string';
	const lv = v.toLowerCase();
	if (['true', 'false', 'yes', 'no', '0', '1'].includes(lv)) return 'boolean';
	if (!isNaN(Number(v))) {
		return Number.isInteger(Number(v)) ? 'integer' : 'number';
	}
	return 'string';
}

/**
 * Generates a Lectern dictionary from parsed CSV data.
 *
 * Mirrors the logic in apps/composer/src/services/generateLecternDictionary.ts
 * but runs in the browser without filesystem or logger dependencies.
 *
 * @param csv        - Parsed CSV with headers and rows
 * @param schemaName - Name for the generated schema (typically the table/index name)
 * @param dictionaryName - Name for the dictionary (typically the index name)
 * @param version    - Semantic version string (default: "1.0.0")
 */
export function generateLecternDictionary(
	csv: ParsedCsv,
	schemaName: string,
	dictionaryName: string,
	version = '1.0.0',
): LecternDictionary {
	const sampleRow = csv.rows[0] ?? [];

	const fields: LecternField[] = csv.headers.map((header, i) => ({
		name: header,
		description: `Field containing ${header} data`,
		valueType: inferValueType(header, sampleRow[i] ?? ''),
		meta: { displayName: header },
	}));

	return {
		name: dictionaryName,
		version,
		description: `Dictionary generated from ${schemaName} data`,
		schemas: [
			{
				name: schemaName,
				description: `Schema generated from ${schemaName} CSV`,
				fields,
			},
		],
	};
}
