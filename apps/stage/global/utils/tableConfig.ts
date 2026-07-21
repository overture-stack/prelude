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
	/** Dataset grouping shown as a section header in the Explore Data dropdown/homepage card */
	group?: string;
}

/** Display order for the groups above — anything not listed here sorts alphabetically after these. */
export const DATA_TABLE_GROUP_ORDER = ['ARGO Clinical', 'Drug Discovery'];

export const tableConfigs: Record<string, TableConfig> = {
	correlationTable: {
		displayName: 'Correlation Data',
		group: 'Drug Discovery',
	},
	mutationTable: {
		displayName: 'Mutation Data',
		group: 'Drug Discovery',
	},
	expressionTable: {
		displayName: 'Expression Data',
		group: 'Drug Discovery',
	},
	proteinTable: {
		displayName: 'Protein Data',
		group: 'Drug Discovery',
	},
	donorTable: {
		displayName: 'Clinical Data',
		group: 'ARGO Clinical',
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
