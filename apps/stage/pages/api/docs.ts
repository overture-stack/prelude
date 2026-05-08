import fs from 'fs';
import { NextApiRequest, NextApiResponse } from 'next';
import path from 'path';

function getCategoryOrder(docsDirectory: string): string[] {
	const configPath = path.join(docsDirectory, 'docs.config.json');
	if (fs.existsSync(configPath)) {
		try {
			const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
			if (Array.isArray(config.categories)) {
				return (config.categories as { id: string }[])
					.map((c) => c.id)
					.filter((id) => fs.existsSync(path.join(docsDirectory, id)));
			}
		} catch {
			// fall through to filesystem order
		}
	}
	return fs
		.readdirSync(docsDirectory, { withFileTypes: true })
		.filter((e) => e.isDirectory() && e.name !== 'img')
		.map((e) => e.name)
		.sort();
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
	try {
		const docsDirectory = path.join(process.cwd(), 'public', 'docs');

		if (!fs.existsSync(docsDirectory)) {
			return res.status(404).json({ error: 'Documentation directory not found' });
		}

		const categories = getCategoryOrder(docsDirectory);
		const filenames: string[] = [];

		for (const category of categories) {
			const categoryDir = path.join(docsDirectory, category);
			const categoryFiles = fs
				.readdirSync(categoryDir)
				.filter((f) => f.endsWith('.md'))
				.sort()
				.map((f) => `${category}/${f}`);
			filenames.push(...categoryFiles);
		}

		if (filenames.length === 0) {
			return res.status(404).json({ error: 'No documentation files found' });
		}

		res.status(200).json(filenames);
	} catch (error) {
		console.error('Error reading docs directory:', error);
		res.status(500).json({ error: 'Unable to read documentation files' });
	}
}
