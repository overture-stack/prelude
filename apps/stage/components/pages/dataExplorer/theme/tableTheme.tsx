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

import { StageThemeInterface } from '@/components/theme';
import { Download } from '@/components/theme/icons';
import { css } from '@emotion/react';
import { CustomExporterInput } from '@overture-stack/arranger-components/dist/Table/DownloadButton/types';
import { UseThemeContextProps } from '@overture-stack/arranger-components/dist/ThemeContext/types';
import { ColumnsSelectButton, DownloadButton } from '@overture-stack/arranger-components';
import urlJoin from 'url-join';
import { CrossTableFilterButton } from '../CrossTableFilterButton';

/**
 * Props for table theme configuration.
 *
 * TypeScript Concept: Interface composition
 * - Breaking down complex configurations into smaller pieces
 * - Makes the function signature clearer
 */
interface TableThemeConfig {
	apiHost: string;
	customExporters?: CustomExporterInput[];
	exportSelectedRowsField: string;
	currentTableName: string;
}

/**
 * Creates theme configuration for the Table, Toolbar, and Pagination components.
 *
 * The Table is the main data display component showing rows and columns.
 * React Concept: Render props
 * - Some config properties accept functions that return JSX
 * - Allows dynamic rendering based on data
 *
 * @param theme - The application's theme object
 * @param callerName - Unique identifier for debugging
 * @param config - Table-specific configuration (API, export settings)
 * @returns Theme configuration for Table components
 */
export const createTableTheme = (
	theme: StageThemeInterface,
	callerName: string,
	config: TableThemeConfig,
): UseThemeContextProps => ({
	callerName,
	components: {
		Table: {
			// ========== Functionality ==========
			hideLoader: true, // Don't show default loading spinner

			// ========== Appearance ==========
			background: theme.colors.white,
			borderColor: theme.colors.grey_3,
			css: css`
				${theme.shadow.default}
			`,

			// ========== Child Components ==========

			/**
			 * Column Types: Customize how different data types are displayed
			 *
			 * React Concept: Render function
			 * - cellValue receives a getValue() function
			 * - Returns custom JSX for each cell
			 */
			columnTypes: {
				all: {
					cellValue: ({ getValue }) => {
						const value = getValue();
						return (
							<span
								css={css`
									display: block;
									padding: 4px 8px;
									margin: -4px -8px;
									border-radius: 4px;
									transition: background-color 0.2s ease-in-out;

									&:hover {
										background-color: ${theme.colors.secondary_light}40;
									}
								`}
							>
								{/* Handle empty/null values with a placeholder */}
								{['', null, 'null', 'NA', undefined, 'undefined'].includes(value) ? (
									<span
										css={css`
											color: #9c9c9c;
										`}
									>
										--
									</span>
								) : (
									value
								)}
							</span>
						);
					},
				},
			},

			// Display for total count (e.g., "Showing 1-20 of 500")
			CountDisplay: {
				fontColor: 'inherit',
			},

			// Download/Export button configuration
			DownloadButton: {
				customExporters: config.customExporters?.[0],
				exportSelectedRowsField: config.exportSelectedRowsField,
				downloadUrl: urlJoin(config.apiHost, 'download'),
				/**
				 * React Concept: Component as a function
				 * - label is a function that returns JSX
				 * - Creates a custom download button with icon
				 */
				label: () => (
					<>
						<Download
							fill={theme.colors.accent_dark}
							style={css`
								margin-right: 0.2rem;

								[disabled] & > path {
									fill: ${theme.colors.grey_5};
								}
							`}
						/>{' '}
						Download
					</>
				),
				ListWrapper: {
					width: '11rem',
				},
			},

			// Dropdown menus (for column selection, etc.)
			DropDown: {
				arrowColor: '#151c3d',
				arrowTransition: 'all 0s',
				background: theme.colors.white,
				borderColor: theme.colors.grey_5,
				css: css`
					${theme.typography.subheading2}
					line-height: 1.3rem;
				`,
				fontColor: theme.colors.accent_dark,
				disabledFontColor: theme.colors.grey_5,
				hoverBackground: `${theme.colors.secondary_light}20`, // 20 = alpha for transparency

				ListWrapper: {
					background: theme.colors.white,
					css: css`
						${theme.shadow.default}
					`,
					fontColor: theme.colors.black,
					fontSize: '0.7rem',
					hoverBackground: `${theme.colors.secondary_light}20`,
				},
			},

			// Table header row styling
			HeaderRow: {
				borderColor: theme.colors.grey_3,
				css: css`
					${theme.typography.data}
				`,
				fontColor: theme.colors.accent_dark,
				fontSize: '13px',
				fontWeight: 'bold',
				lineHeight: '1.7rem',
			},

			// Rows per page selector
			MaxRowsSelector: {
				fontColor: 'inherit',
			},

			// Individual data row styling
			Row: {
				css: css`
					/* Zebra striping: alternating row colors for readability */
					&:nth-of-type(2n-1) {
						background-color: ${theme.colors.grey_1};
					}
				`,
				hoverBackground: theme.colors.grey_highlight,
				lineHeight: '1.5rem',
				selectedBackground: theme.colors.secondary_pale,
				verticalBorderColor: theme.colors.grey_3,
			},

			// Container for the entire table
			TableWrapper: {
				margin: '0.5rem 0',
			},

			// Toolbar configuration with custom tools
			Toolbar: {
				tools: [
					// CrossTableFilterButton as first tool
					CrossTableFilterButton as any,
					ColumnsSelectButton as any,
					DownloadButton as any,
				],
			},
		},
	},
});
