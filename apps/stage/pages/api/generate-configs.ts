import type { NextApiRequest, NextApiResponse } from 'next';
import { parseCsv } from '@/lib/configGenerator/csvParser';
import { generateEsMapping } from '@/lib/configGenerator/generateEsMapping';
import { generatePostgresSql } from '@/lib/configGenerator/generatePostgresTable';
import { generateArrangerConfigs } from '@/lib/configGenerator/generateArrangerConfigs';

export type GenerateConfigsRequest = {
	csvContent: string;
	indexName: string;
	documentType: 'file' | 'analysis';
	tableName: string;
};

export type GenerateConfigsResponse = {
	esMapping: object;
	arrangerBase: object;
	arrangerExtended: object;
	arrangerTable: object;
	arrangerFacets: object;
	postgresSql: string;
};

export default function handler(
	req: NextApiRequest,
	res: NextApiResponse<GenerateConfigsResponse | { error: string }>,
) {
	if (req.method !== 'POST') {
		return res.status(405).json({ error: 'Method not allowed' });
	}

	const { csvContent, indexName, documentType, tableName } = req.body as GenerateConfigsRequest;

	if (!csvContent?.trim()) {
		return res.status(400).json({ error: 'CSV content is required' });
	}
	if (!indexName?.trim()) {
		return res.status(400).json({ error: 'Index name is required' });
	}

	const csv = parseCsv(csvContent);

	if (csv.headers.length === 0) {
		return res.status(400).json({ error: 'Could not parse CSV headers' });
	}

	const esMapping = generateEsMapping(csv, indexName);
	const { base, extended, table, facets } = generateArrangerConfigs(esMapping, indexName, documentType);
	const postgresSql = generatePostgresSql(csv, tableName || indexName);

	return res.status(200).json({
		esMapping,
		arrangerBase: base,
		arrangerExtended: extended,
		arrangerTable: table,
		arrangerFacets: facets,
		postgresSql,
	});
}
