import fs from 'fs';
import { NextApiRequest, NextApiResponse } from 'next';
import path from 'path';

export interface DictionaryInfo {
	id: string;
	title: string;
	path: string;
}

// Auto-titles a Lectern dictionary's own `name` field: snake_case identifiers
// (e.g. "drug_discovery_correlation") become "Drug Discovery Correlation"; names
// that already read as prose (e.g. "ICGC-ARGO Data Dictionary") pass through as-is.
function titleFromName(name: string): string {
	if (!/^[a-z0-9_]+$/.test(name)) {
		return name;
	}
	return name
		.split('_')
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(' ');
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
	try {
		const dictionaryDirectory = path.join(process.cwd(), 'public', 'dictionary');

		if (!fs.existsSync(dictionaryDirectory)) {
			return res.status(404).json({ error: 'Dictionary directory not found' });
		}

		const files = fs
			.readdirSync(dictionaryDirectory)
			.filter((f) => f.endsWith('.json'))
			.sort();

		const dictionaries: DictionaryInfo[] = [];
		for (const filename of files) {
			const id = filename.replace(/\.json$/, '');
			try {
				const content = JSON.parse(fs.readFileSync(path.join(dictionaryDirectory, filename), 'utf8'));
				const name = typeof content.name === 'string' ? content.name : id;
				dictionaries.push({ id, title: titleFromName(name), path: `/dictionary/${id}` });
			} catch (err) {
				console.error(`Failed to read dictionary ${filename}:`, err);
			}
		}

		if (dictionaries.length === 0) {
			return res.status(404).json({ error: 'No dictionary files found' });
		}

		// Cache for a minute — dictionary set rarely changes; saves disk reads on repeated nav renders.
		res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
		res.status(200).json(dictionaries);
	} catch (error) {
		console.error('Error reading dictionary directory:', error);
		res.status(500).json({ error: 'Unable to read dictionary files' });
	}
}
