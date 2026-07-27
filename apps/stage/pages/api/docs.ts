import fs from 'fs';
import { NextApiRequest, NextApiResponse } from 'next';
import path from 'path';
import {
	extractOrder,
	extractTitle,
	generateSlug,
} from '../../components/pages/documentation/utils/documentUtils';

export interface DocSectionMeta {
	filepath: string;
	title: string;
	id: string;
	order: number;
	category: string;
}

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

		const sections: DocSectionMeta[] = [];

		const addFilesFromDir = (dirPath: string, category: string, filepathPrefix: string) => {
			const files = fs
				.readdirSync(dirPath)
				.filter((f) => f.endsWith('.md'))
				.sort();
			for (const filename of files) {
				const filepath = `${filepathPrefix}/${filename}`;
				let title = '';
				try {
					const content = fs.readFileSync(path.join(dirPath, filename), 'utf8');
					title = extractTitle(content);
				} catch (err) {
					console.error(`Failed to read ${filepath}:`, err);
				}
				sections.push({
					filepath,
					title: title || generateSlug(filename),
					id: generateSlug(filename),
					order: extractOrder(filename),
					category,
				});
			}
		};

		const categories = getCategoryOrder(docsDirectory);
		for (const category of categories) {
			addFilesFromDir(path.join(docsDirectory, category), category, category);
		}

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
