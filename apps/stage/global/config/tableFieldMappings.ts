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

/**
 * Table Field Mappings Configuration
 *
 * Defines how Hugo symbol fields are structured in each data table.
 * Used for cross-table gene filtering functionality.
 *
 * Filter Strategies:
 * - 'single': Table has one Hugo symbol field (e.g., data.hugo_symbol)
 * - 'dual': Table has two Hugo symbol fields (e.g., data.hugo_symbol_a, data.hugo_symbol_b)
 *
 * Usage:
 * - Extracting Hugo symbols from selected rows
 * - Building SQON filters for target tables
 * - Cross-table navigation with gene filters
 */

export interface TableFieldMapping {
	tableName: string; // Display name of the table
	tablePath: string; // URL path (e.g., /correlationTable)
	hugoSymbolFields: string[]; // Field paths for Hugo symbols
	filterStrategy: 'single' | 'dual'; // How to build SQON filters
}

/**
 * Mapping of table IDs to their Hugo symbol field configurations
 *
 * Key: Table ID (folder name, e.g., 'correlationTable')
 * Value: Field mapping configuration
 */
export const TABLE_FIELD_MAPPINGS: Record<string, TableFieldMapping> = {
	correlationTable: {
		tableName: 'Correlation Table',
		tablePath: '/correlationTable',
		hugoSymbolFields: ['data.hugo_symbol_a', 'data.hugo_symbol_b'],
		filterStrategy: 'dual',
	},
	mutationTable: {
		tableName: 'Mutation Table',
		tablePath: '/mutationTable',
		hugoSymbolFields: ['data.hugo_symbol'],
		filterStrategy: 'single',
	},
	expressionTable: {
		tableName: 'Expression Table',
		tablePath: '/expressionTable',
		hugoSymbolFields: ['data.hugo_symbol'],
		filterStrategy: 'single',
	},
	proteinTable: {
		tableName: 'Protein Table',
		tablePath: '/proteinTable',
		hugoSymbolFields: ['data.hugo_symbol_a', 'data.hugo_symbol_b'],
		filterStrategy: 'dual',
	},
};

/**
 * Get table field mapping by table ID
 */
export function getTableFieldMapping(tableId: string): TableFieldMapping | undefined {
	return TABLE_FIELD_MAPPINGS[tableId];
}

/**
 * Check if a table uses dual Hugo symbol fields
 */
export function isDualFieldTable(tableId: string): boolean {
	const mapping = TABLE_FIELD_MAPPINGS[tableId];
	return mapping?.filterStrategy === 'dual';
}
