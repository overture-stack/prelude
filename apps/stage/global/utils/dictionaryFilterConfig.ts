// global/utils/dictionaryFilterConfig.ts

/**
 * Per-dictionary schema-metadata filter dropdowns for the Lectern viewer.
 *
 * Only dictionaries that carry schema-level `meta` fields beyond `displayName`
 * (which the viewer already renders natively) need an entry here. Add one when a
 * dictionary's schemas declare a `meta` field worth filtering by.
 *
 * See configs/lectern/argo-data-dictionary.json's schema `meta.category` values
 * (Registration, Clinical, Treatment, Follow-up & Biomarkers, History & Exposure).
 */

export interface DictionaryFilterDropdownConfig {
	label: string;
	filterProperty: string;
}

export const dictionaryFilterConfigs: Record<string, DictionaryFilterDropdownConfig[]> = {
	'argo-data-dictionary': [{ label: 'Clinical Domain', filterProperty: 'meta.category' }],
};

export function getDictionaryFilterDropdowns(dictionaryId: string): DictionaryFilterDropdownConfig[] | undefined {
	return dictionaryFilterConfigs[dictionaryId];
}
