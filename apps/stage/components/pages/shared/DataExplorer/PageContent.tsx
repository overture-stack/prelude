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
import { useArrangerData } from '@overture-stack/arranger-components';
import { SQONType } from '@overture-stack/arranger-components/dist/DataContext/types.js';
import stringify from 'fast-json-stable-stringify';
import { isEqual } from 'lodash';
import { useEffect, useMemo, useState } from 'react';
import useUrlParamState from '@/global/hooks/useUrlParamsState';
import Facets from './Facets';
import QueryBar from './QueryBar';
import RepoTable from './RepoTable';
import { DataExplorerConfig } from './types';

/**
 * Props interface for PageContent component.
 *
 * TypeScript Concept: Extending/reusing types
 * - We need the full config object to pass down to child components
 */
interface PageContentProps {
	config: DataExplorerConfig;
}

/**
 * PageContent Component
 *
 * The main layout component that combines:
 * - Facets sidebar (filters)
 * - QueryBar (active filters display)
 * - RepoTable (data grid)
 *
 * Advanced React Concepts Introduced:
 * 1. useState - Managing component state
 * 2. useEffect - Side effects and lifecycle
 * 3. Custom hooks - useUrlParamState, useArrangerData
 * 4. State synchronization - Keeping URL and SQON in sync
 *
 * @param props - Component properties
 * @returns JSX element
 */
const PageContent = ({ config }: PageContentProps) => {
	const theme = useTheme();

	/**
	 * React Hook: useState
	 *
	 * Purpose: Add state to functional components
	 *
	 * Syntax: const [value, setValue] = useState(initialValue)
	 * - value: current state value
	 * - setValue: function to update the state
	 * - initialValue: starting value
	 *
	 * Example:
	 * const [showSidebar, setShowSidebar] = useState(true)
	 * - showSidebar starts as true
	 * - Call setShowSidebar(false) to hide sidebar
	 */
	const [showSidebar, setShowSidebar] = useState(true);

	/**
	 * Computed value based on state.
	 *
	 * JavaScript Concept: Ternary operator
	 * condition ? valueIfTrue : valueIfFalse
	 */
	const sidebarWidth = showSidebar ? theme.dimensions.facets.width : 0;

	/**
	 * Custom Hook: useArrangerData
	 *
	 * What is a custom hook?
	 * - A function that uses other hooks
	 * - Reusable logic across components
	 * - Must start with "use"
	 *
	 * This hook provides:
	 * - sqon: Current filter state (Structured Query Object Notation)
	 * - setSQON: Function to update filters
	 *
	 * Pattern: Destructuring return values
	 * const { sqon, setSQON } = useArrangerData(...)
	 */
	const { sqon, setSQON } = useArrangerData({ callerName: `${config.callerName}-PageContent` });

	/**
	 * State: Track if this is the first render.
	 *
	 * Why?
	 * - On first render, we want to load filters from URL
	 * - On subsequent renders, we want to update URL when filters change
	 * - This prevents infinite loops
	 */
	const [firstRender, setFirstRender] = useState<boolean>(true);

	/**
	 * Custom Hook: useUrlParamState
	 *
	 * Purpose: Sync state with URL query parameters
	 * - Reads filter state from URL on mount
	 * - Updates URL when filters change
	 * - Enables bookmarking/sharing filtered views
	 *
	 * Configuration object explained:
	 * - prepare: Pre-process the URL string before parsing
	 * - deSerialize: Convert URL string to JavaScript object
	 * - serialize: Convert JavaScript object to URL string
	 *
	 * Why this complexity?
	 * - Arranger uses "fieldName" but URL might have "field"
	 * - Need to normalize the data
	 */
	const [currentFilters, setCurrentFilters] = useUrlParamState<SQONType | null>('filters', null, {
		prepare: (v) => v.replace('"field"', '"fieldName"'),
		deSerialize: (v) => {
			return v ? JSON.parse(v) : null;
		},
		serialize: (v) => (v ? stringify(v) : ''),
	});

	/**
	 * React Hook: useEffect
	 *
	 * Purpose: Handle side effects and lifecycle events
	 *
	 * What are side effects?
	 * - Anything that affects something outside the component
	 * - Examples: API calls, updating URL, setting timers
	 *
	 * Syntax: useEffect(() => { code }, [dependencies])
	 * - Runs after every render
	 * - But only if dependencies changed
	 *
	 * This effect: Load filters from URL on first render
	 */
	useEffect(() => {
		if (firstRender) {
			// If URL has filters, apply them
			currentFilters && setSQON(currentFilters);
			// Mark that first render is complete
			setFirstRender(false);
		}
		/**
		 * Dependency array:
		 * - Effect runs when any of these values change
		 * - [currentFilters, firstRender, setSQON]
		 */
	}, [currentFilters, firstRender, setSQON]);

	/**
	 * Second useEffect: Sync SQON changes to URL
	 *
	 * Logic explanation:
	 * - firstRender: Skip on first render (prevents overwriting URL)
	 * - isEqual(sqon, currentFilters): Skip if they're already the same
	 * - setCurrentFilters(sqon): Update URL with new filters
	 *
	 * Short-circuit evaluation:
	 * - || means "or" - if left side is true, don't evaluate right side
	 * - Used here to prevent unnecessary URL updates
	 */
	useEffect(() => {
		firstRender || isEqual(sqon, currentFilters) || setCurrentFilters(sqon);
	}, [currentFilters, firstRender, setCurrentFilters, sqon]);

	/**
	 * useMemo: Optimize rendering
	 *
	 * Why empty dependency array here?
	 * - Layout doesn't change based on props
	 * - Child components manage their own state
	 * - Prevents unnecessary re-renders
	 */
	return useMemo(
		() => (
			<div
				css={css`
					flex: 1;
					width: 100vw;
				`}
			>
				<div
					css={css`
						display: flex;
						flex-direction: row;
						margin-left: 0;
					`}
				>
					{/*
						Future feature: Toggle sidebar visibility
						Currently commented out but shows how you could add this

					<button
						onClick={() => setShowSidebar(!showSidebar)}
					>
						{showSidebar ? 'Hide' : 'Show'} Filters
					</button>
					*/}

					{/* Sidebar: Filters/Facets */}
					<aside
						css={css`
							flex: 0 0 ${sidebarWidth}px;
							flex-direction: column;
							background-color: ${theme.colors.white};
							z-index: 1;
							${theme.shadow.right};
							height: calc(100vh - ${theme.dimensions.footer.height + theme.dimensions.navbar.height}px);
							overflow-y: scroll;
						`}
					>
						<Facets
							callerName={config.callerName}
							enableQuickSearch={config.enableQuickSearch}
							quickSearchConfig={config.quickSearchConfig}
						/>
					</aside>

					{/* Main content area: QueryBar + Table */}
					<div
						css={css`
							display: flex;
							flex-direction: column;
							width: 100%;
							height: calc(100vh - ${theme.dimensions.footer.height + theme.dimensions.navbar.height}px);
							overflow-y: scroll;
						`}
					>
						<div
							css={css`
								flex: 8.5;
								margin: 0 15px 0 15px;
								max-width: calc(100vw - ${sidebarWidth + 10}px);
							`}
						>
							<QueryBar callerName={config.callerName} />
							<RepoTable
								callerName={config.callerName}
								apiHost={config.arrangerApi}
								exportRowIdField={config.exportRowIdField}
								exportConfig={config.exportConfig}
							/>
						</div>
					</div>
				</div>
			</div>
		),
		[],
	);
};

export default PageContent;
