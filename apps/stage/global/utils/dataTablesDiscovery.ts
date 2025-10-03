// global/utils/dataTablesDiscovery.ts
import fs from 'fs';
import path from 'path';

export interface DataTableInfo {
	id: string;
	title: string;
	path: string;
}

/**
 * Discovers data tables by scanning the pages directory for dataTable* folders.
 *
 * Updated for new architecture:
 * - Now scans pages/ directory instead of components/pages/activeDataTables
 * - Looks for folders matching pattern: dataTable*
 * - Works with the refactored structure where config lives in pages/
 *
 * Learning Note: File System Operations in Next.js API Routes
 * - fs module only works server-side (Node.js)
 * - process.cwd() gives the root directory of the project
 * - path.join() safely creates cross-platform file paths
 */
export function discoverDataTables(): DataTableInfo[] {
	try {
		/**
		 * Updated path: Now points to pages/ directory
		 * This matches our new architecture where data table pages live in pages/dataTable*
		 */
		const pagesPath = path.join(process.cwd(), 'pages');

		// Check if directory exists
		if (!fs.existsSync(pagesPath)) {
			console.warn('Pages directory not found:', pagesPath);
			return [];
		}

		/**
		 * Read all entries in pages directory
		 * withFileTypes: true gives us Dirent objects (includes isDirectory() method)
		 */
		const entries = fs.readdirSync(pagesPath, { withFileTypes: true });

		/**
		 * Filter for directories that match our data table naming pattern
		 *
		 * Pattern: dataTable* (e.g., dataTableOne, dataTableTwo, etc.)
		 * - Must be a directory
		 * - Must start with "dataTable"
		 *
		 * This automatically discovers all data tables without hardcoding them!
		 */
		const dataTableDirs = entries.filter(
			(entry) => entry.isDirectory() && entry.name.startsWith('dataTable'),
		);

		/**
		 * Convert directory names to DataTableInfo objects
		 *
		 * Map operation explained:
		 * - Takes each directory entry
		 * - Extracts meaningful info (id, title, path)
		 * - Returns structured object
		 */
		return dataTableDirs.map((dir) => {
			/**
			 * Format the title for display
			 *
			 * Example: "dataTableOne" → "Data Table One"
			 *
			 * Steps:
			 * 1. Replace capital letters with space + letter: "dataTableOne" → "data Table One"
			 * 2. Capitalize first letter: "data Table One" → "Data Table One"
			 * 3. Trim whitespace
			 */
			const title = dir.name
				.replace(/([A-Z])/g, ' $1') // Add space before capitals
				.replace(/^./, (str) => str.toUpperCase()) // Capitalize first letter
				.trim();

			/**
			 * Create the URL path
			 * Next.js automatically maps pages/dataTableOne/index.tsx to /dataTableOne
			 */
			const urlPath = `/${dir.name}`;

			return {
				id: dir.name, // e.g., "dataTableOne"
				title, // e.g., "Data Table One"
				path: urlPath, // e.g., "/dataTableOne"
			};
		});
	} catch (error) {
		console.error('Error discovering data tables:', error);
		return [];
	}
}
