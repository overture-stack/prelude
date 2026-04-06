import type { NextApiRequest, NextApiResponse } from 'next';
import { submitCsv, SubmissionResult, SubmissionError } from '@/lib/conductor/pipeline';

export const config = {
	api: {
		bodyParser: {
			sizeLimit: '10mb',
		},
		responseLimit: false,
	},
};

export type SubmitRequest = {
	csvContent: string;
	tableName: string;
	indexName: string;
	delimiter?: string;
	filename?: string;
};

export type SubmitResponse = SubmissionResult;
export type SubmitErrorResponse = { error: string };

export default async function handler(
	req: NextApiRequest,
	res: NextApiResponse<SubmitResponse | SubmitErrorResponse>,
) {
	if (req.method !== 'POST') {
		return res.status(405).json({ error: 'Method not allowed' });
	}

	const { csvContent, tableName, indexName, delimiter, filename } = req.body as SubmitRequest;

	if (!csvContent?.trim()) return res.status(400).json({ error: 'CSV content is required' });
	if (!tableName?.trim()) return res.status(400).json({ error: 'Table name is required' });
	if (!indexName?.trim()) return res.status(400).json({ error: 'Index name is required' });

	try {
		const result = await submitCsv({ csvContent, tableName, indexName, delimiter, filename });
		return res.status(200).json(result);
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : 'Unexpected error during submission';
		return res.status(500).json({ error: message });
	}
}
