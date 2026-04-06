import { EsMapping } from './generateEsMapping';

// Re-export the mapping type so the API route can import from one place.
export type { EsMapping };

type DocType = 'file' | 'analysis';

const SEARCHABLE_TYPES = new Set(['keyword', 'text', 'integer', 'float', 'boolean', 'date']);

function toDisplayName(fieldName: string): string {
	return fieldName
		.replace(/_/g, ' ')
		.replace(/\b\w/g, (c) => c.toUpperCase());
}

function isSubmissionField(fieldName: string): boolean {
	return fieldName.startsWith('submission_metadata');
}

export interface ArrangerConfigs {
	base: object;
	extended: object;
	table: object;
	facets: object;
}

export function generateArrangerConfigs(mapping: any, indexName: string, docType: DocType): ArrangerConfigs {
	const dataProps: Record<string, { type: string }> =
		mapping?.mappings?.properties?.data?.properties ?? {};

	const extended: Array<{ displayName: string; fieldName: string }> = [];
	const tableColumns: Array<object> = [];
	const facetAggregations: Array<object> = [];

	// submission_metadata fields — hidden by default
	const submissionFields = ['submission_metadata.submission_id', 'submission_metadata.source_file_name', 'submission_metadata.processed_at'];
	submissionFields.forEach((f) => {
		extended.push({ displayName: toDisplayName(f.split('.').pop()!), fieldName: f });
	});

	// data fields
	Object.entries(dataProps).forEach(([key, field]) => {
		const fieldName = `data.${key}`;
		const facetName = `data__${key}`;

		extended.push({ displayName: toDisplayName(key), fieldName });

		tableColumns.push({
			canChangeShow: true,
			fieldName,
			show: true,
			sortable: true,
		});

		if (SEARCHABLE_TYPES.has(field.type)) {
			facetAggregations.push({
				active: true,
				fieldName: facetName,
				show: true,
			});
		}
	});

	// submission_metadata table columns (hidden)
	submissionFields.forEach((f) => {
		tableColumns.push({ canChangeShow: true, fieldName: f, show: false, sortable: false });
	});

	return {
		base: {
			documentType: docType,
			esIndex: `${indexName}_centric`,
		},
		extended: { extended },
		table: {
			table: {
				rowIdFieldName: 'submission_metadata.submission_id',
				columns: tableColumns,
			},
		},
		facets: {
			facets: { aggregations: facetAggregations },
		},
	};
}
