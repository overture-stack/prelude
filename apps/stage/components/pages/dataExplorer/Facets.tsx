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
import { Aggregations, QuickSearch, useArrangerTheme } from '@overture-stack/arranger-components';
import { ReactElement } from 'react';
import { createFacetsTheme } from './theme/facetsTheme';
import { QuickSearchConfig } from './types';

/**
 * Props interface for the Facets component.
 *
 * TypeScript Concepts:
 * - Interface for type safety
 * - Optional properties with ?
 */
interface FacetsProps {
	/** Unique identifier for debugging */
	callerName: string;
	/** Whether to show QuickSearch feature */
	enableQuickSearch?: boolean;
	/** Configuration for QuickSearch (required if enableQuickSearch is true) */
	quickSearchConfig?: QuickSearchConfig;
}

/**
 * Facets Component
 *
 * The sidebar that displays filterable facets (like filters in an e-commerce site).
 *
 * What this component does:
 * - Shows filterable fields (e.g., Gender, Age, Study)
 * - Each filter shows available values and counts
 * - Optionally includes QuickSearch for specific field searches
 * - Users can select/deselect values to filter the data table
 *
 * React Concepts:
 * 1. Conditional Rendering - Shows QuickSearch only if enabled
 * 2. Component Composition - Combines Aggregations and QuickSearch
 * 3. Props - Receives configuration from parent
 *
 * @param props - Component properties
 * @returns ReactElement (JSX)
 */
const Facets = ({ callerName, enableQuickSearch, quickSearchConfig }: FacetsProps): ReactElement => {
	/**
	 * React Hook: useTheme()
	 * - Access to the application's theme
	 */
	const theme = useTheme();

	/**
	 * Apply custom theme to Arranger components.
	 *
	 * Pattern: Conditional configuration
	 * - Pass quickSearchConfig only if QuickSearch is enabled
	 * - Factory function handles the conditional logic
	 */
	useArrangerTheme(createFacetsTheme(theme, callerName, quickSearchConfig));

	/**
	 * JSX Return with Conditional Rendering
	 *
	 * React Concept: Conditional Rendering with &&
	 * - {condition && <Component />}
	 * - If condition is true, render Component
	 * - If condition is false, render nothing
	 *
	 * Example: enableQuickSearch && <QuickSearch />
	 * - Shows QuickSearch only when enableQuickSearch is true
	 */
	return (
		<div
			css={css`
				padding-bottom: 2rem;
			`}
		>
			{/* Header for the filters sidebar */}
			<h2
				css={css`
					${theme.typography.subheading}
					padding: 6px 0 2px 8px;
					margin: 0;
					border-bottom: 1px solid ${theme.colors.grey_3};
				`}
			>
				Filters
			</h2>

			{/**
			 * Conditional Rendering: QuickSearch
			 *
			 * Boolean short-circuit evaluation:
			 * - If enableQuickSearch is true, evaluate the right side
			 * - If enableQuickSearch is false, stop (nothing renders)
			 *
			 * This is equivalent to:
			 * {enableQuickSearch ? <QuickSearch /> : null}
			 */}
			{enableQuickSearch && <QuickSearch />}

			{/**
			 * Aggregations Component (from Arranger)
			 *
			 * What it does:
			 * - Automatically renders all configured facets
			 * - Shows filter values with counts
			 * - Handles user interactions (selecting/deselecting)
			 * - Updates the global SQON (filter state)
			 *
			 * React Concept: Smart Component
			 * - Contains its own logic and state
			 * - Connected to Arranger's data context
			 * - We just declare we want it, it handles everything
			 */}
			<Aggregations />
		</div>
	);
};

export default Facets;
