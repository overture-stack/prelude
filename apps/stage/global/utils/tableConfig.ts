// global/utils/tableConfig.ts

/**
 * Table Configuration
 *
 * Centralized configuration for custom table display names.
 * Maps route IDs (folder names) to custom display information.
 *
 * Usage:
 * - Add entries for each dataTable* folder you want to customize
 * - If no entry exists, the system will auto-generate a title from the folder name
 * - displayName: The name shown in navbar, homepage, and breadcrumbs
 *
 * Note: Environment variables (NEXT_PUBLIC_DATATABLE_*_NAME) will override these values if set
 */

export interface TableConfig {
	displayName: string;
}

export const tableConfigs: Record<string, TableConfig> = {
	fileTable: {
		displayName: 'File Explorer',
	},
};

/**
 * Get table configuration by route ID
 * Returns undefined if no custom config exists (will use auto-generated title)
 */
export function getTableConfig(routeId: string): TableConfig | undefined {
	return tableConfigs[routeId];
}

/**
 * Register table metadata at runtime
 * This allows pages to define their own display name
 *
 * Usage in page component:
 * ```
 * import { registerTableMetadata } from '../../global/utils/tableConfig';
 *
 * registerTableMetadata('dataTableOne', {
 *   displayName: 'My Custom Name'
 * });
 * ```
 */
export function registerTableMetadata(routeId: string, metadata: Partial<TableConfig>): void {
	if (!tableConfigs[routeId]) {
		tableConfigs[routeId] = { displayName: metadata.displayName || routeId };
	} else {
		tableConfigs[routeId] = {
			...tableConfigs[routeId],
			...metadata,
		};
	}
}
