import { NextApiRequest, NextApiResponse } from 'next';
import { loadDocumentationSectionsSummary } from '../../lib/documentation';

export interface DocSectionMeta {
	filePath: string;
	title: string;
	id: string;
	order: number;
	category: string;
}

export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
	try {
		// Single source of truth with the documentation page loader, so the navbar
		// dropdown and the pages agree on categories, ordering, and recursive
		// (submodule) doc trees like Arranger.
		const sections = await loadDocumentationSectionsSummary();

		if (sections.length === 0) {
			return res.status(404).json({ error: 'No documentation files found' });
		}

		// Cache for a minute — file list rarely changes; saves disk reads on repeated nav renders.
		res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
		res.status(200).json(sections);
	} catch (error) {
		console.error('Error reading docs directory:', error);
		res.status(500).json({ error: 'Unable to read documentation files' });
	}
}
