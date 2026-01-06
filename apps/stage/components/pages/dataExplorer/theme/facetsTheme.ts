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
import { css } from '@emotion/react';
import { UseThemeContextProps } from '@overture-stack/arranger-components/dist/types';
import { QuickSearchConfig } from '../types';

/**
 * Creates theme configuration for Facets and QuickSearch components.
 *
 * TypeScript/React Concepts:
 * - Factory function: Returns a configuration object based on inputs
 * - Optional parameters: quickSearchConfig uses the ? operator
 * - Type safety: Return type is UseThemeContextProps from Arranger
 *
 * Why this approach?
 * - Centralizes all styling in one place
 * - Easy to customize per data table if needed
 * - Type-safe configuration prevents errors
 *
 * @param theme - The application's theme object (colors, fonts, etc.)
 * @param callerName - Unique identifier for debugging
 * @param quickSearchConfig - Optional QuickSearch configuration
 * @returns Theme configuration object for Arranger components
 */
export const createFacetsTheme = (
	theme: StageThemeInterface,
	callerName: string,
	quickSearchConfig?: QuickSearchConfig,
): UseThemeContextProps => ({
	callerName,
	components: {
		// ========== AGGREGATIONS (Filters/Facets) ==========
		Aggregations: {
			// Styling for each filter group (e.g., "Study", "Gender", etc.)
			AggsGroup: {
				collapsedBackground: theme.colors.grey_2,
				css: css`
					/* Left border with rotating colors for visual distinction */
					border-left: 3px solid;

					/* CSS nth-of-type: Repeating pattern of 5 colors */
					&:nth-of-type(5n + 1) {
						border-left-color: ${theme.colors.secondary};
					}
					&:nth-of-type(5n + 2) {
						border-left-color: ${theme.colors.accent2};
					}
					&:nth-of-type(5n + 3) {
						border-left-color: ${theme.colors.warning};
					}
					&:nth-of-type(5n + 4) {
						border-left-color: ${theme.colors.primary};
					}
					&:nth-of-type(5n + 5) {
						border-left-color: ${theme.colors.accent3};
					}

					/* Styling for filter values */
					.bucket-item {
						${theme.typography.data}
					}

					/* Styling for filter group title */
					.title {
						${theme.typography.subheading}
						line-height: 20px;
					}

					/* Icon styling with hover effects */
					.sorting-icon,
					.alphabetic-sorting,
					[class*='SortAlphaIcon'] {
						color: ${theme.colors.grey_5} !important;
						transition: color 0.2s ease-in-out !important;
						&:hover {
							color: ${theme.colors.secondary_light} !important;
						}
					}

					.title:hover .sorting-icon,
					.title:hover .alphabetic-sorting,
					.title:hover [class*='SortAlphaIcon'] {
						color: ${theme.colors.secondary_light} !important;
					}

					.search-icon,
					[class*='SearchIcon'],
					[class*='search-icon'] {
						color: ${theme.colors.grey_5} !important;
						transition: color 0.2s ease-in-out !important;
						&:hover {
							color: ${theme.colors.secondary_light} !important;
						}
					}

					.title:hover .search-icon,
					.title:hover [class*='SearchIcon'],
					.title:hover [class*='search-icon'] {
						color: ${theme.colors.secondary_light} !important;
					}

					.columns-icon,
					.download-icon,
					[class*='ColumnsIcon'],
					[class*='DownloadIcon'],
					[class*='columns-icon'],
					[class*='download-icon'],
					button svg,
					.action-icon,
					[class*='action-icon'] {
						color: ${theme.colors.grey_5} !important;
						transition: color 0.2s ease-in-out !important;
						&:hover {
							color: ${theme.colors.secondary_light} !important;
						}
					}

					button:hover svg,
					.title:hover .columns-icon,
					.title:hover .download-icon,
					.title:hover [class*='ColumnsIcon'],
					.title:hover [class*='DownloadIcon'],
					.title:hover [class*='columns-icon'],
					.title:hover [class*='download-icon'],
					.title:hover .action-icon,
					.title:hover [class*='action-icon'] {
						color: ${theme.colors.secondary_light} !important;
					}
				`,
				groupDividerColor: theme.colors.grey_3,
				headerBackground: theme.colors.white,
				headerDividerColor: theme.colors.grey_2,
				headerFontColor: theme.colors.accent_dark,
			},

			// Count badges showing number of items per filter value
			BucketCount: {
				activeBackground: theme.colors.secondary_2,
				background: theme.colors.grey_2,
				borderRadius: '3px',
				css: css`
					${theme.typography.label2}
					padding: 0 3px;
					margin: 2px 0;
				`,
				fontSize: '10px',
			},

			// Search input within each filter group
			FilterInput: {
				css: css`
					border-radius: 5px;
					border: 1px solid ${theme.colors.secondary};
					margin: 6px 5px 7px 0;
					&.focused {
						box-shadow: inset 0 0 2px 1px ${theme.colors.accent};
					}
					& input {
						${theme.typography.data}
						&::placeholder {
							color: ${theme.colors.black};
						}
					}
					input[type='text' i] {
						margin-left: 5px;
						margin-top: 2px;
					}
				`,
			},

			// "Show More" / "Show Less" button styling
			MoreOrLessButton: {
				css: css`
					${theme.typography.label2};
					color: ${theme.colors.accent};

					/* CSS ::before pseudo-element for icons */
					&::before {
						padding-top: 3px;
						margin-right: 3px;
					}

					/* SVG icon for "Show More" */
					&.more::before {
						content: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='11' height='11' viewBox='0 0 11 11'%3E%3Cpath fill='%2304518C' fill-rule='evenodd' d='M7.637 6.029H6.034v1.613c0 .291-.24.53-.534.53-.294 0-.534-.239-.534-.53V6.03H3.363c-.294 0-.534-.238-.534-.529 0-.29.24-.529.534-.529h1.603V3.358c0-.291.24-.53.534-.53.294 0 .534.239.534.53V4.97h1.603c.294 0 .534.238.534.529 0 .29-.24.529-.534.529M5.5 0C2.462 0 0 2.462 0 5.5S2.462 11 5.5 11 11 8.538 11 5.5 8.538 0 5.5 0'/%3E%3C/svg%3E%0A");
					}

					/* SVG icon for "Show Less" */
					&.less::before {
						content: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='11' height='11' viewBox='0 0 20 20'%3E%3Cpath fill='%2304518c' fill-rule='evenodd' d='M13.81 10.952H6.19c-.523 0-.952-.428-.952-.952s.429-.952.952-.952h7.62c.523 0 .952.428.952.952s-.429.952-.952.952M10 0C4.476 0 0 4.476 0 10s4.476 10 10 10 10-4.476 10-10S15.524 0 10 0'/%3E%3C/svg%3E%0A");
					}
				`,
			},

			// Range slider filters (for numeric values)
			RangeAggs: {
				RangeLabel: {
					borderRadius: '3px',
					css: css`
						${theme.typography.label2}
						padding: 0 4px;

						&.top {
							background: ${theme.colors.grey_3};
						}
					`,
					fontWeight: 'bold',
				},
				RangeSlider: {
					borderColor: theme.colors.grey_5,
					css: css`
						${theme.shadow.default}
					`,
				},
				RangeTrack: {
					inBackground: theme.colors.secondary,
					outBackground: theme.colors.accent,
				},
			},

			// Toggle buttons (for boolean/categorical filters)
			ToggleButton: {
				background: theme.colors.white,
				activeBackground: theme.colors.secondary_light,
				borderColor: theme.colors.grey_4,
				css: css`
					padding: 2px 5px 8px;
					margin: 5px 5px 0;
				`,
				disabledBackground: theme.colors.grey_2,
				disabledFontColor: theme.colors.grey_6,
				fontColor: theme.colors.black,
				OptionCSS: css`
					${theme.typography.data}
				`,
			},
		},

		// ========== QUICKSEARCH CONFIGURATION ==========
		...(quickSearchConfig && {
			QuickSearch: {
				fieldNames: quickSearchConfig.fieldNames,
				headerTitle: quickSearchConfig.headerTitle,
				placeholder: quickSearchConfig.placeholder,

				// Dropdown styling for search results
				DropDownItems: {
					css: css`
						border: 1px solid ${theme.colors.secondary};
						border-radius: 5px;
					`,
					entityLogo: {
						enabled: false,
					},
					resultKeyText: {
						css: css`
							margin-left: 20px;
							font-weight: bold;
						`,
					},
					resultValue: {
						css: css`
							margin-left: 20px;
						`,
					},
				},

				QuickSearchWrapper: {
					css: css`
						border-left: 3px solid ${theme.colors.accent2_dark} !important;

						.title,
						.quicksearch-title {
							${theme.typography.subheading};
							line-height: 20px;
							color: ${theme.colors.accent_dark};
						}
						/* Force chevron size and color to match facets */
						.arrow-icon {
							width: 9px !important;
							height: 9px !important;
							min-width: 9px !important;
							min-height: 9px !important;
							fill: ${theme.colors.grey_5} !important;
							transition: fill 0.2s ease-in-out !important;
						}

						/* Hover color same as facet titles */
						.title:hover .arrow-icon,
						.quicksearch-title:hover .arrow-icon {
							fill: ${theme.colors.secondary_light} !important;
						}
					`,
				},

				TreeJointIcon: {
					fill: theme.colors.primary_dark,
					size: 10,
					transition: 'all 0s',
				},

				// Pinned/selected values styling
				PinnedValues: {
					background: theme.colors.primary_dark,
					css: css`
						${theme.typography.label}
						/* SVG X icon for removing pinned values */
						&::after {
							content: url(data:image/svg+xml,%3Csvg%20width%3D%228%22%20height%3D%228%22%20stroke%3D%22white%22%20stroke-width%3D%222%22%3E%0A%20%20%3Cline%20x1%3D%220%22%20y1%3D%220%22%20x2%3D%228%22%20y2%3D%228%22%20/%3E%0A%20%20%3Cline%20x1%3D%228%22%20y1%3D%220%22%20x2%3D%220%22%20y2%3D%228%22%20/%3E%0A%3C/svg%3E);
							margin: 0 0 0 0.5rem;
						}
					`,
					fontColor: theme.colors.white,
					hoverBackground: theme.colors.primary,
					margin: '0.1rem',
					padding: '0 0.5rem',
				},
			},
		}),
	},
});
