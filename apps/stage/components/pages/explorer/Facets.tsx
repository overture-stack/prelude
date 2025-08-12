/*
 *
 * Copyright (c) 2021 The Ontario Institute for Cancer Research. All rights reserved
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
import { Aggregations, useArrangerTheme } from '@overture-stack/arranger-components';

import Button from '@/components/Button';
import { Chevron } from '@/components/theme/icons';
import { DMSThemeInterface } from '../../theme';
import {
	getVisualizationFocusCss,
	useVisualizationFocusContext,
} from './VisualizationFocusContext';

const getAggregationsStyles = (theme: DMSThemeInterface) => ({
	callerName: 'Explorer-Facets',
	components: {
		Aggregations: {
			ActionIcon: {
				fill: theme.colors.secondary,
			},
			AggsGroup: {
				collapsedBackground: theme.colors.grey_2,
				css: css`
					border-left: 3px solid;

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

					.bucket-item {
						${theme.typography.data}
					}

					.title {
						${theme.typography.subheading}
						line-height: 20px;
					}
				`,
				groupDividerColor: theme.colors.grey_3,
				headerBackground: theme.colors.white,
				headerDividerColor: theme.colors.grey_2,
				headerFontColor: theme.colors.accent_dark,
			},
			BooleanAgg: {
				BucketCount: {
					css: css`
						margin: 0;
					`,
				},
			},
			BucketCount: {
				activeBackground: theme.colors.secondary_2,
				background: theme.colors.grey_3,
				borderRadius: '3px',
				css: css`
					${theme.typography.label2}
					padding: 0 3px;
					margin: 2px 0;
				`,
				fontSize: '10px',
			},
			FilterInput: {
				css: css`
					border-radius: 5px;
					border: 1px solid ${theme.colors.secondary};
					margin: 6px 5px 7px 0;

					&.focused {
						box-shadow: 0 0 4px 1px rgba(155, 199, 237, 0.8);
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
			MoreOrLessButton: {
				css: css`
					${theme.typography.label2};
					color: ${theme.colors.accent};

					&::before {
						padding-top: 3px;
						margin-right: 3px;
					}

					&.more::before {
						content: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='11' height='11' viewBox='0 0 11 11'%3E%3Cpath fill='%2304518C' fill-rule='evenodd' d='M7.637 6.029H6.034v1.613c0 .291-.24.53-.534.53-.294 0-.534-.239-.534-.53V6.03H3.363c-.294 0-.534-.238-.534-.529 0-.29.24-.529.534-.529h1.603V3.358c0-.291.24-.53.534-.53.294 0 .534.239.534.53V4.97h1.603c.294 0 .534.238.534.529 0 .29-.24.529-.534.529M5.5 0C2.462 0 0 2.462 0 5.5S2.462 11 5.5 11 11 8.538 11 5.5 8.538 0 5.5 0'/%3E%3C/svg%3E%0A");
					}

					&.less::before {
						content: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='11' height='11' viewBox='0 0 20 20'%3E%3Cpath fill='%2304518c' fill-rule='evenodd' d='M13.81 10.952H6.19c-.523 0-.952-.428-.952-.952s.429-.952.952-.952h7.62c.523 0 .952.428.952.952s-.429.952-.952.952M10 0C4.476 0 0 4.476 0 10s4.476 10 10 10 10-4.476 10-10S15.524 0 10 0'/%3E%3C/svg%3E%0A");
					}
				`,
			},
			RangeAgg: {
				RangeLabel: {
					// each of the labels with values
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
					// the knobs you click on to select a value
					borderColor: theme.colors.grey_5,
					css: css`
						${theme.shadow.default}
					`,
				},
				RangeTrack: {
					// the line behind the component
					inBackground: theme.colors.secondary, // within the selected range
					outBackground: theme.colors.accent, // outside the selected range
				},
			},
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
			TreeJointIcon: {
				fill: '#151c3d',
				size: 8,
				transition: 'all 0s',
			},
		},
	},
});

const Facets = ({ hidePanel }: { hidePanel: () => void }) => {
	const theme = useTheme();
	useArrangerTheme(getAggregationsStyles(theme));
	const { hasVisualizationFocus } = useVisualizationFocusContext();

	return (
		<div
			css={css`
				padding-bottom: 3rem;
			`}
		>
			<div
				css={css`
					padding: 10px;
				`}
			>
				<Button variant="secondary" size="sm" onClick={hidePanel}>
					<Chevron
						style={css`
							transform: rotate(90deg);
							margin-right: 5px;
						`}
						width={8}
						height={8}
					/>
					<span>Hide Bar</span>
				</Button>
			</div>
			<div
				css={css`
					${getVisualizationFocusCss(hasVisualizationFocus)};
				`}
			>
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
				<Aggregations />
			</div>
		</div>
	);
};

export default Facets;
