import fs from 'fs';
import { NextApiRequest, NextApiResponse } from 'next';
import path from 'path';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
	try {
		const docsDirectory = path.join(process.cwd(), 'public', 'docs');

		// Check if directory exists
		if (!fs.existsSync(docsDirectory)) {
			return res.status(404).json({ error: 'Documentation directory not found' });
		}

		const filenames = fs
			.readdirSync(docsDirectory)
			.filter((filename) => filename.endsWith('.md'))
			.sort();

		if (filenames.length === 0) {
			return res.status(404).json({ error: 'No documentation files found' });
		}

		res.status(200).json(filenames);
	} catch (error) {
		console.error('Error reading docs directory:', error);
		res.status(500).json({ error: 'Unable to read documentation files' });
	}
}
