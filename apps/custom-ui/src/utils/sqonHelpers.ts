import { SQONType } from '@overture-stack/arranger-components';

/**
 * Converts field name from aggregation format (double underscore) to filter format (dot notation)
 * @param fieldName - The field name in aggregation format (e.g., 'data__gender')
 * @returns The field name in filter format (e.g., 'data.gender')
 */
const convertFieldNameForFilter = (fieldName: string): string => {
	// Convert double underscores to dots for filter field names
	// Aggregation field names use __ but filter field names use .
	return fieldName.replace(/__/g, '.');
};

/**
 * Creates a SQON filter for a field value match
 * @param fieldName - The field name in aggregation format (e.g., 'data__gender')
 * @param value - The value to filter by
 * @returns A SQON filter object
 */
const createFieldValueFilter = (fieldName: string, value: string | string[]): SQONType => {
	const values = Array.isArray(value) ? value : [value];
	// Convert field name from aggregation format (__) to filter format (.)
	const filterFieldName = convertFieldNameForFilter(fieldName);
	
	return {
		op: 'in',
		content: {
			fieldName: filterFieldName,
			value: values,
		},
	} as SQONType;
};

/**
 * Checks if a filter for the given field and value already exists in SQON
 * @param sqon - The SQON to check
 * @param fieldName - The field name to check for (in filter format, e.g., 'data.gender')
 * @param value - The value to check for
 * @returns True if the filter exists, false otherwise
 */
const filterExists = (sqon: SQONType | null, fieldName: string, value: string): boolean => {
	if (!sqon) return false;

	// Handle 'and' operations
	if (sqon.op === 'and' && Array.isArray(sqon.content)) {
		return sqon.content.some((filter: any) => {
			// Check if this is an 'in' operation with matching field and value
			if (filter.op === 'in' && filter.content) {
				const filterFieldName = filter.content.fieldName;
				const filterValues = Array.isArray(filter.content.value) 
					? filter.content.value 
					: [filter.content.value];
				return filterFieldName === fieldName && filterValues.includes(value);
			}
			// Recursively check nested 'and' operations
			if (filter.op === 'and' && Array.isArray(filter.content)) {
				return filterExists(filter as SQONType, fieldName, value);
			}
			return false;
		});
	}

	// Handle single 'in' operation
	if (sqon.op === 'in' && sqon.content) {
		const filterFieldName = (sqon.content as any).fieldName;
		const filterValues = Array.isArray((sqon.content as any).value)
			? (sqon.content as any).value
			: [(sqon.content as any).value];
		return filterFieldName === fieldName && filterValues.includes(value);
	}

	return false;
};

/**
 * Removes a filter for the given field and value from SQON
 * @param sqon - The SQON to remove the filter from
 * @param fieldName - The field name to remove (in filter format, e.g., 'data.gender')
 * @param value - The value to remove
 * @returns A new SQON with the filter removed, or null if no filters remain
 */
const removeFilter = (sqon: SQONType | null, fieldName: string, value: string): SQONType | null => {
	if (!sqon) return null;

	// Handle 'and' operations
	if (sqon.op === 'and' && Array.isArray(sqon.content)) {
		const filteredContent = sqon.content
			.map((filter: any) => {
				// If this is the filter we want to remove, return null
				if (filter.op === 'in' && filter.content) {
					const filterFieldName = filter.content.fieldName;
					const filterValues = Array.isArray(filter.content.value)
						? filter.content.value
						: [filter.content.value];
					if (filterFieldName === fieldName && filterValues.includes(value)) {
						return null;
					}
				}
				// Recursively process nested 'and' operations
				if (filter.op === 'and' && Array.isArray(filter.content)) {
					return removeFilter(filter as SQONType, fieldName, value);
				}
				return filter;
			})
			.filter((filter: any) => filter !== null);

		// If no filters remain, return null
		if (filteredContent.length === 0) {
			return null;
		}

		// Always wrap in 'and' operation for consistency (even with single filter)
		// SQONViewer expects top-level to always have op: 'and' with content as array
		return {
			op: 'and',
			content: filteredContent,
		} as SQONType;
	}

	// Handle single 'in' operation
	if (sqon.op === 'in' && sqon.content) {
		const filterFieldName = (sqon.content as any).fieldName;
		const filterValues = Array.isArray((sqon.content as any).value)
			? (sqon.content as any).value
			: [(sqon.content as any).value];
		
		if (filterFieldName === fieldName && filterValues.includes(value)) {
			return null;
		}
	}

	return sqon;
};

/**
 * Toggles a filter in SQON - adds it if it doesn't exist, removes it if it does
 * @param currentSQON - The current SQON filter (can be null)
 * @param fieldName - The field name in aggregation format (e.g., 'data__gender')
 * @param value - The value to toggle
 * @returns A new SQON with the filter toggled
 */
const toggleSQONFilter = (currentSQON: SQONType | null, fieldName: string, value: string): SQONType | null => {
	const filterFieldName = convertFieldNameForFilter(fieldName);
	
	// Check if the filter already exists
	if (filterExists(currentSQON, filterFieldName, value)) {
		// Remove the filter
		return removeFilter(currentSQON, filterFieldName, value);
	} else {
		// Add the filter
		const newFilter = createFieldValueFilter(fieldName, value);
		return mergeSQON(currentSQON, newFilter);
	}
};

/**
 * Merges a new filter with existing SQON
 * @param currentSQON - The current SQON filter (can be null)
 * @param newFilter - The new filter to add
 * @returns A merged SQON filter
 */
const mergeSQON = (currentSQON: SQONType | null, newFilter: SQONType): SQONType => {
	if (!currentSQON) {
		// Always wrap in 'and' operation for consistency
		return {
			op: 'and',
			content: [newFilter],
		} as SQONType;
	}

	// If current SQON is already an 'and' operation, add the new filter to its content
	if (currentSQON.op === 'and' && Array.isArray(currentSQON.content)) {
		return {
			op: 'and',
			content: [...currentSQON.content, newFilter],
		} as SQONType;
	}

	// Otherwise, wrap both in an 'and' operation
	return {
		op: 'and',
		content: [currentSQON, newFilter],
	} as SQONType;
};

/**
 * Creates a chart filter handler function (matching the example pattern)
 * This function takes a field name and returns a handler that toggles filters
 * @param fieldName - The field name in aggregation format (e.g., 'data__gender')
 * @param sqon - Current SQON state
 * @param setSQON - Function to update SQON
 * @returns A function that handles bar clicks and toggles the filter
 */
export const chartFilter = (
	fieldName: string,
	sqon: SQONType | null,
	setSQON: (sqon: SQONType | null) => void
) => {
	return (filterValue: string | string[]) => {
		// Handle array values (for cases like sunburst charts with multiple selections)
		if (Array.isArray(filterValue)) {
			// For multiple values, toggle each one
			let newSQON = sqon;
			for (const value of filterValue) {
				newSQON = toggleSQONFilter(newSQON, fieldName, String(value));
			}
			setSQON(newSQON);
		} else {
			// Single value - toggle it
			const newSQON = toggleSQONFilter(sqon, fieldName, filterValue);
			setSQON(newSQON);
		}
	};
};

