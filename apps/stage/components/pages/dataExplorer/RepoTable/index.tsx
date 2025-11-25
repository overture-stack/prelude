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

import { css, useTheme } from '@emotion/react';
import {
	Pagination,
	Table,
	TableContextProvider,
	Toolbar,
	useArrangerTheme,
} from '@overture-stack/arranger-components';
import { CustomExporterInput } from '@overture-stack/arranger-components/dist/Table/DownloadButton/types';
import { useMemo } from 'react';
import { useRouter } from 'next/router';
import { ExportConfig } from '../types';
import { createTableTheme } from '../theme/tableTheme';

/**
 * Props interface for RepoTable component.
 *
 * TypeScript Concept: Interface with optional properties
 * - Some props are required, some are optional
 * - Optional props have default values or conditional logic
 */
interface RepoTableProps {
	/** Unique identifier for debugging */
	callerName: string;
	/** API host URL for downloads */
	apiHost: string;
	/** Field name used for identifying rows during export */
	exportRowIdField: string;
	/** Optional export configuration */
	exportConfig?: ExportConfig;
}

/**
 * RepoTable Component
 *
 * The main data table that displays rows of data with sorting, filtering,
 * column selection, and export capabilities.
 *
 * React Concepts:
 * 1. useMemo - Performance optimization
 * 2. Component Composition - Combines multiple Arranger components
 * 3. Context Provider - TableContextProvider shares state between child components
 *
 * Component Structure:
 * - TableContextProvider: Shares state (selected rows, sorting, etc.)
 *   - Toolbar: Column selector, download button, etc.
 *   - Table: The actual data grid
 *   - Pagination: Page navigation controls
 *
 * @param props - Component properties
 * @returns JSX element
 */
const RepoTable = ({ callerName, apiHost, exportRowIdField, exportConfig }: RepoTableProps) => {
	const theme = useTheme();
	const router = useRouter();
	const currentTableName = router.pathname.replace('/', '') || 'unknown';

	/**
	 * Create default export configuration.
	 *
	 * JavaScript Concept: Template Literals
	 * - Backticks allow embedded expressions: `string ${variable}`
	 *
	 * Date handling:
	 * - new Date() creates current date/time
	 * - .toISOString() converts to "2024-10-02T20:35:00.000Z"
	 * - .slice(0, 10) takes first 10 chars: "2024-10-02"
	 * - .replace(/-/g, '') removes dashes: "20241002"
	 */
	const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');

	/**
	 * TypeScript Concept: Type Assertion
	 * - as CustomExporterInput[] tells TypeScript the exact type
	 *
	 * JavaScript Concept: Default values with ||
	 * - Use exportConfig if provided, otherwise use default
	 */
	const customExporters: CustomExporterInput[] = exportConfig?.customExporters || [
		{
			label: 'Download',
			fileName: exportConfig?.fileName || `data-export.${today}.tsv`,
		},
	];

	/**
	 * Apply table theme configuration.
	 *
	 * Pattern: Configuration object
	 * - Group related values into an object
	 * - Pass to theme factory function
	 */
	useArrangerTheme(
		createTableTheme(theme, callerName, {
			apiHost,
			customExporters,
			exportSelectedRowsField: exportRowIdField,
			currentTableName,
		}),
	);

	/**
	 * React Hook: useMemo
	 *
	 * Why use useMemo?
	 * - Prevents unnecessary re-renders
	 * - Only re-creates JSX when dependencies change
	 * - Empty dependency array [] means: create once, never re-create
	 *
	 * Performance Optimization:
	 * - Without useMemo: Component re-renders every time parent re-renders
	 * - With useMemo: Component only re-renders when dependencies change
	 *
	 * When to use:
	 * - Expensive computations
	 * - Complex JSX that doesn't need to update often
	 *
	 * Syntax: useMemo(() => value, [dependencies])
	 */
	return useMemo(
		() => (
			<>
				<article
					css={css`
						background-color: ${theme.colors.white};
						border-radius: 5px;
						margin-bottom: 12px;
						padding: 8px;
						${theme.shadow.default};
					`}
				>
					{/**
					 * React Concept: Context Provider Pattern
					 *
					 * TableContextProvider:
					 * - Creates a "context" (shared state)
					 * - All child components can access this state
					 * - No need to pass props down through each level
					 *
					 * What state is shared?
					 * - Selected rows
					 * - Current sorting
					 * - Visible columns
					 * - Current page
					 *
					 * This is called "Context API" - a core React pattern
					 */}
					<TableContextProvider>
						{/**
						 * Toolbar Component
						 * - Now includes CrossTableFilterButton, Columns, and Download buttons
						 * - Custom tools configured via theme
						 */}
						<Toolbar />

						{/**
						 * Table Component
						 * - The actual data grid
						 * - Sortable columns
						 * - Selectable rows
						 * - Custom cell rendering
						 */}
						<Table />

						{/**
						 * Pagination Component
						 * - Page navigation (1, 2, 3, ...)
						 * - Rows per page selector
						 * - Total count display
						 */}
						<Pagination />
					</TableContextProvider>
				</article>
			</>
		),
		/**
		 * useMemo dependency array
		 *
		 * Empty array [] means:
		 * - Create this JSX once when component mounts
		 * - Never re-create it (even if parent re-renders)
		 *
		 * Why is this safe here?
		 * - Theme is stable (doesn't change)
		 * - Arranger components manage their own state
		 * - No props or state used in the JSX that could change
		 */
		[],
	);
};

export default RepoTable;
