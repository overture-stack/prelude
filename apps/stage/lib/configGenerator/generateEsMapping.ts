import { EsFieldType, inferEsType } from './inferTypes';
import { ParsedCsv } from './csvParser';

interface EsField {
	type: EsFieldType;
}

interface EsMapping {
	index_patterns: string[];
	aliases: Record<string, object>;
	mappings: {
		properties: Record<string, { type: string; properties?: Record<string, EsField> }>;
	};
	settings: {
		number_of_shards: number;
		number_of_replicas: number;
	};
}

export function generateEsMapping(csv: ParsedCsv, indexName: string): EsMapping {
	const sampleRow = csv.rows[0] ?? [];

	const dataProperties: Record<string, EsField> = {};
	csv.headers.forEach((header, i) => {
		const sanitized = header.replace(/\s+/g, '_').toLowerCase();
		dataProperties[sanitized] = { type: inferEsType(header, sampleRow[i] ?? '') };
	});

	return {
		index_patterns: [`${indexName}-*`],
		aliases: { [`${indexName}_centric`]: {} },
		mappings: {
			properties: {
				data: {
					type: 'object',
					properties: dataProperties,
				},
				submission_metadata: {
					type: 'object',
					properties: {
						submission_id: { type: 'keyword' },
						source_file_name: { type: 'keyword' },
						processed_at: { type: 'date' },
					},
				},
			},
		},
		settings: {
			number_of_shards: 1,
			number_of_replicas: 1,
		},
	};
}
