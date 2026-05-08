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

import { getTableFieldMapping } from '../../../global/config/tableFieldMappings';
import { SQONType } from '@overture-stack/arranger-components/dist/DataContext/types.js';

/**
 * Cross-Table SQON Filter Builder
 *
 * Generates SQON (Structured Query Object Notation) filters for applying
 * Hugo symbol gene lists across different data tables.
 *
 * Handles two filter strategies:
 * 1. Single field: data.hugo_symbol IN [gene list]
 * 2. Dual fields: (data.hugo_symbol_a IN [gene list]) OR (data.hugo_symbol_b IN [gene list])
 *
 * Usage:
 * ```typescript
 * const genes = ['TP53', 'BRCA1', 'EGFR'];
 * const sqon = buildCrossTableSQON(genes, 'expressionTable');
 * // Navigate: router.push(`/expressionTable?filters=${encodeURIComponent(JSON.stringify(sqon))}`);
 * ```
 */

/**
 * Build SQON filter for applying genes to a target table
 *
 * @param hugoSymbols - Array of Hugo symbol gene names
 * @param targetTableName - Table ID to apply filter to
 * @returns SQON object or null if invalid inputs
 */
export function buildCrossTableSQON(hugoSymbols: string[], targetTableName: string): SQONType | null {
	const mapping = getTableFieldMapping(targetTableName);

	if (!mapping) {
		console.error(`No field mapping found for target table: ${targetTableName}`);
		return null;
	}

	if (!hugoSymbols || hugoSymbols.length === 0) {
		console.warn('No Hugo symbols provided for filter');
		return null;
	}

	try {
		let sqon: any;

		if (mapping.filterStrategy === 'single') {
			// Single field strategy: data.hugo_symbol IN [genes]
			// SQON builder optimizes away single AND wrappers, so we construct manually
			// Arranger expects: { op: 'and', content: [{ op: 'in', content: {...} }] }
			sqon = {
				op: 'and',
				content: [
					{
						op: 'in',
						content: {
							fieldName: mapping.hugoSymbolFields[0],
							value: hugoSymbols,
						},
					},
				],
			};
			console.log('Built SINGLE field SQON:', JSON.stringify(sqon, null, 2));
		} else {
			// Dual field strategy: (hugo_symbol_a IN [genes]) OR (hugo_symbol_b IN [genes])
			// Use OR at top level - Arranger's SQONViewer can't display nested OR within AND
			sqon = {
				op: 'or',
				content: [
					{
						op: 'in',
						content: {
							fieldName: mapping.hugoSymbolFields[0],
							value: hugoSymbols,
						},
					},
					{
						op: 'in',
						content: {
							fieldName: mapping.hugoSymbolFields[1],
							value: hugoSymbols,
						},
					},
				],
			};
			console.log('Built DUAL field SQON:', JSON.stringify(sqon, null, 2));
		}

		return sqon as unknown as SQONType;
	} catch (error) {
		console.error('Error building cross-table SQON:', error);
		return null;
	}
}

/**
 * Estimate the URL length that would be generated
 *
 * Browsers typically limit URLs to ~2000 characters.
 * Use this to warn users before attempting navigation.
 *
 * @param sqon - SQON filter object
 * @param baseUrl - Base URL path (e.g., '/expressionTable')
 * @returns Estimated URL length in characters
 */
export function estimateUrlLength(sqon: SQONType, baseUrl: string): number {
	if (!sqon) return baseUrl.length;

	try {
		const sqonString = JSON.stringify(sqon);
		const encodedSqon = encodeURIComponent(sqonString);
		// Format: {baseUrl}?filters={encodedSqon}
		return baseUrl.length + 9 + encodedSqon.length; // 9 chars for "?filters="
	} catch (error) {
		console.error('Error estimating URL length:', error);
		return Infinity; // Return max to trigger warning
	}
}

/**
 * Maximum safe URL length
 * Conservative estimate accounting for browser differences
 */
export const MAX_URL_LENGTH = 2000;

/**
 * Check if a gene list would exceed URL length limits
 *
 * @param hugoSymbols - Array of Hugo symbols
 * @param targetTableName - Target table ID
 * @returns True if URL would be too long
 */
export function wouldExceedUrlLimit(hugoSymbols: string[], targetTableName: string): boolean {
	const sqon = buildCrossTableSQON(hugoSymbols, targetTableName);
	if (!sqon) return false;

	const mapping = getTableFieldMapping(targetTableName);
	if (!mapping) return false;

	const estimatedLength = estimateUrlLength(sqon, mapping.tablePath);
	return estimatedLength > MAX_URL_LENGTH;
}

/**
 * Calculate approximate maximum genes that can be included
 *
 * @param targetTableName - Target table ID
 * @param avgGeneNameLength - Average gene name length (default: 6 chars)
 * @returns Rough estimate of max genes
 */
export function estimateMaxGenes(targetTableName: string, avgGeneNameLength: number = 6): number {
	const mapping = getTableFieldMapping(targetTableName);
	if (!mapping) return 0;

	// Very rough estimate based on URL structure
	const baseOverhead = 200; // Account for JSON structure and encoding
	const availableSpace = MAX_URL_LENGTH - mapping.tablePath.length - baseOverhead;

	// Each gene adds: name + quotes + comma + encoding overhead
	const perGeneOverhead = avgGeneNameLength + 10;

	return Math.floor(availableSpace / perGeneOverhead);
}

/**
 * Build a filter URL for cross-table navigation
 *
 * @param hugoSymbols - Array of Hugo symbols
 * @param targetTableName - Target table ID
 * @returns Complete URL with encoded filter, or null if invalid
 */
export function buildFilterUrl(hugoSymbols: string[], targetTableName: string): string | null {
	const mapping = getTableFieldMapping(targetTableName);
	if (!mapping) return null;

	const sqon = buildCrossTableSQON(hugoSymbols, targetTableName);
	if (!sqon) return null;

	try {
		const encodedSqon = encodeURIComponent(JSON.stringify(sqon));
		return `${mapping.tablePath}?filters=${encodedSqon}`;
	} catch (error) {
		console.error('Error building filter URL:', error);
		return null;
	}
}
