/*
 *
 * Copyright (c) 2024 The Ontario Institute for Cancer Research. All rights reserved
 *
 *  This program and the accompanying materials are made available under the terms of
 *  the GNU Affero General Public License v3.0. You should have received a copy of the
 *  GNU Affero General Public License along with this program.
 *   If not, see <http://www.gnu.org/licenses/>.
 *
 *  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY
 *  EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES
 *  OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT
 *  SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT,
 *  INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED
 *  TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS;
 *  OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER
 *  IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN
 *  ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 *
 */

import { getTableFieldMapping } from '../config/tableFieldMappings';

/**
 * Hugo Symbol Extractor
 *
 * Extracts Hugo symbol values from selected table rows.
 * Handles both single-field tables (Expression, Mutation) and dual-field tables (Correlation, Protein).
 * Automatically deduplicates symbols when extracting from dual-field tables.
 *
 * Usage:
 * ```typescript
 * const selectedRows = [...]; // From Arranger table selection
 * const symbols = extractHugoSymbols(selectedRows, 'expressionTable');
 * // Returns: ['TP53', 'BRCA1', 'EGFR', ...]
 * ```
 */

/**
 * Extract Hugo symbols from selected table rows
 *
 * @param selectedRows - Array of selected row objects from Arranger table
 * @param sourceTableName - Table ID (e.g., 'correlationTable', 'mutationTable')
 * @returns Array of unique Hugo symbol strings
 */
export function extractHugoSymbols(selectedRows: any[], sourceTableName: string): string[] {
	const mapping = getTableFieldMapping(sourceTableName);

	if (!mapping) {
		console.error(`No field mapping found for table: ${sourceTableName}`);
		return [];
	}

	if (!selectedRows || selectedRows.length === 0) {
		console.warn('extractHugoSymbols: No rows provided');
		return [];
	}

	// Debug logging
	if (process.env.NODE_ENV === 'development') {
		console.log('extractHugoSymbols - Table:', sourceTableName);
		console.log('extractHugoSymbols - Mapping:', mapping);
		console.log('extractHugoSymbols - Rows count:', selectedRows.length);
		console.log('extractHugoSymbols - First row:', selectedRows[0]);
	}

	// Use Set for automatic deduplication
	const symbols = new Set<string>();

	selectedRows.forEach((row, index) => {
		mapping.hugoSymbolFields.forEach((fieldPath) => {
			const value = getNestedValue(row, fieldPath);
			if (process.env.NODE_ENV === 'development' && index === 0) {
				console.log(`extractHugoSymbols - Trying field "${fieldPath}":`, value);
			}
			if (value && typeof value === 'string' && value.trim()) {
				symbols.add(value.trim());
			}
		});
	});

	const result = Array.from(symbols).sort();
	if (process.env.NODE_ENV === 'development') {
		console.log('extractHugoSymbols - Extracted genes:', result);
	}

	return result; // Sort for consistent ordering
}

/**
 * Get nested object value by dot-notation path
 *
 * Example:
 * ```typescript
 * const obj = { data: { hugo_symbol: 'TP53' } };
 * getNestedValue(obj, 'data.hugo_symbol'); // Returns: 'TP53'
 * ```
 *
 * @param obj - Object to extract value from
 * @param path - Dot-notation path (e.g., 'data.hugo_symbol')
 * @returns Value at path, or undefined if not found
 */
function getNestedValue(obj: any, path: string): any {
	if (!obj || !path) {
		return undefined;
	}

	const keys = path.split('.');
	let current = obj;

	for (const key of keys) {
		if (current === null || current === undefined) {
			return undefined;
		}
		current = current[key];
	}

	return current;
}

/**
 * Count unique Hugo symbols that would be extracted
 * Useful for displaying counts before extraction
 *
 * @param selectedRows - Array of selected row objects
 * @param sourceTableName - Table ID
 * @returns Number of unique Hugo symbols
 */
export function countUniqueHugoSymbols(selectedRows: any[], sourceTableName: string): number {
	return extractHugoSymbols(selectedRows, sourceTableName).length;
}

/**
 * Validate that selected rows contain Hugo symbol data
 *
 * @param selectedRows - Array of selected row objects
 * @param sourceTableName - Table ID
 * @returns True if at least one Hugo symbol found
 */
export function hasHugoSymbols(selectedRows: any[], sourceTableName: string): boolean {
	return countUniqueHugoSymbols(selectedRows, sourceTableName) > 0;
}
