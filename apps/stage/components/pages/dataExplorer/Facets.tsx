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
import { MultiQuickSearchConfig, QuickSearchConfig } from './types';

/**
 * Props for the Facets component.
 */
interface FacetsProps {
	/** Unique identifier used for Arranger debugging and theming */
	callerName: string;

	/** Enable QuickSearch functionality (defaults to false if not provided) */
	enableQuickSearch?: boolean;

	/**
	 * Configuration for a single QuickSearch instance.
	 * Mutually exclusive with multiQuickSearchConfig.
	 * Used by: Expression Table, Mutation Table
	 */
	quickSearchConfig?: QuickSearchConfig;

	/**
	 * Configuration for multiple QuickSearch instances.
	 * Mutually exclusive with quickSearchConfig.
	 * Used by: Correlation Table, Protein Table
	 */
	multiQuickSearchConfig?: MultiQuickSearchConfig;
}

/**
 * Renders the filter sidebar with faceted search and optional QuickSearch functionality.
 *
 * QuickSearch Patterns:
 * - Single QuickSearch: Pass quickSearchConfig (e.g., Expression/Mutation tables)
 * - Multi QuickSearch: Pass multiQuickSearchConfig (e.g., Correlation/Protein tables)
 */
const Facets = ({
	callerName,
	enableQuickSearch,
	quickSearchConfig,
	multiQuickSearchConfig,
}: FacetsProps): ReactElement => {
	const theme = useTheme();

	useArrangerTheme(createFacetsTheme(theme, callerName, quickSearchConfig));

	return (
		<div>
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

			{/* Multi-QuickSearch: Render multiple instances with direct props */}
			{enableQuickSearch && multiQuickSearchConfig && (
				<>
					{multiQuickSearchConfig.configs.map((config, index) => (
						<QuickSearch
							key={`quicksearch-${index}`}
							name={`quicksearch-${index}`}
							fieldNames={config.fieldNames}
							displayFieldName={
								config.displayFieldName ||
								(typeof config.fieldNames === 'string' ? config.fieldNames : config.fieldNames[0])
							}
							theme={{
								headerTitle: config.headerTitle,
								placeholder: config.placeholder,
								FilterInput: {
									placeholder: config.placeholder,
								},
							}}
						/>
					))}
				</>
			)}

			{/* Single QuickSearch: Configuration comes from global theme */}
			{enableQuickSearch && quickSearchConfig && !multiQuickSearchConfig && <QuickSearch />}

			{/* Aggregations: Renders all configured facets automatically */}
			<Aggregations />
		</div>
	);
};

export default Facets;
