// global/utils/dataTablesDiscovery.ts
import fs from 'fs';
import path from 'path';

export interface DataTableInfo {
	id: string;
	title: string;
	path: string;
}

/**
 * Simple utility to discover data tables based on folder names
 * in the components/pages/dataTables directory
 */
export function discoverDataTables(): DataTableInfo[] {
	try {
		const dataTablesPath = path.join(process.cwd(), 'components', 'pages', 'activeDataTables');

		// Check if directory exists
		if (!fs.existsSync(dataTablesPath)) {
			console.warn('Data tables directory not found:', dataTablesPath);
			return [];
		}

		// Read directories
		const entries = fs.readdirSync(dataTablesPath, { withFileTypes: true });
		const directories = entries.filter((entry) => entry.isDirectory());

		// Convert to data table info
		return directories.map((dir) => {
			// Special case handling for known acronyms
			let title = dir.name;

			// Handle specific cases like mRNAData
			if (title === 'mRNAData') {
				title = 'mRNA Data';
			} else {
				// Format the title (capitalize first letter, add spaces between camelCase)
				title = title
					.replace(/([A-Z])/g, ' $1') // Add space before capital letters
					.replace(/^./, (str) => str.toUpperCase()); // Capitalize first letter
			}

			// Use known path if available, otherwise create a path based on name
			const path = `/${dir.name}`;

			return {
				id: dir.name,
				title: title.trim(),
				path,
			};
		});
	} catch (error) {
		console.error('Error discovering data tables:', error);
		return [];
	}
}
