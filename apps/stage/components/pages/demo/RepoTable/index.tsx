/*
 *
 * Copyright (c) 2022 The Ontario Institute for Cancer Research. All rights reserved
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

import { useMemo } from 'react';
import { css, useTheme } from '@emotion/react';
import {
	Pagination,
	Table,
	TableContextProvider,
	useArrangerTheme,
	Toolbar,
} from '@overture-stack/arranger-components';
import { CustomExporterInput } from '@overture-stack/arranger-components/dist/Table/DownloadButton/types';
import { UseThemeContextProps } from '@overture-stack/arranger-components/dist/ThemeContext/types';
import urlJoin from 'url-join';

import { getConfig } from '@/global/config';
import StyledLink from '@/components/Link';
import { StageThemeInterface } from '@/components/theme';
import { Download } from '@/components/theme/icons';
import { INTERNAL_API_PROXY } from '@/global/utils/constants';

const getTableConfigs = ({
	apiHost,
	customExporters,
	theme,
}: {
	apiHost: string;
	customExporters?: CustomExporterInput;
	theme: StageThemeInterface;
}): UseThemeContextProps => ({
	callerName: 'RepoTable',
	components: {
		Table: {
			// functionality
			hideLoader: true,

			// appearance
			background: theme.colors.white,
			borderColor: theme.colors.grey_3,
			css: css`
				${theme.shadow.default}
			`,

			// Child components
			CountDisplay: {
				fontColor: 'inherit',
			},
			DownloadButton: {
				customExporters,
				downloadUrl: urlJoin(apiHost, 'download'),
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
				hoverBackground: theme.colors.secondary_light,

				ListWrapper: {
					background: theme.colors.white,
					css: css`
						${theme.shadow.default}
					`,
					fontColor: theme.colors.black,
					fontSize: '0.7rem',
					hoverBackground: theme.colors.secondary_light,
				},
			},
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
			MaxRowsSelector: {
				fontColor: 'inherit',
			},
			Row: {
				css: css`
					&:nth-of-type(2n-1) {
						background-color: ${theme.colors.grey_1};
					}
				`,
				hoverBackground: theme.colors.grey_highlight,
				lineHeight: '1.5rem',
				selectedBackground: 'pink',
				verticalBorderColor: theme.colors.grey_3,
			},
			TableWrapper: {
				margin: '0.5rem 0',
			},
		},
	},
});

const RepoTable = () => {
	const { NEXT_PUBLIC_ARRANGER_MANIFEST_COLUMNS } = getConfig();
	const theme = useTheme();
	console.log({NEXT_PUBLIC_ARRANGER_MANIFEST_COLUMNS});

	const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
	const manifestColumns = NEXT_PUBLIC_ARRANGER_MANIFEST_COLUMNS.split(',')
		.filter((field) => field.trim()) // break it into arrays, and ensure there's no empty field names
		.map((fieldName) => fieldName.replace(/['"]+/g, '').trim());
		console.log({manifestColumns});
	const customExporters = [
		{ label: 'File Table', fileName: `data-explorer-table-export.${today}.tsv` }, // exports a TSV with what is displayed on the table (columns selected, etc.)
		{ label: 'File Manifest', fileName: `score-manifest.${today}.tsv`, columns: manifestColumns }, // exports a TSV with the manifest columns
		{
			label: () => (
				<span
					css={css`
						border-top: 1px solid ${theme.colors.grey_3};
						margin-top: -3px;
						padding-top: 7px;
						white-space: pre-line;

						a {
							margin-left: 3px;
						}
					`}
				>
					To download files using a file manifest, please follow these
					<StyledLink
						css={css`
							line-height: inherit;
						`}
						href="https://www.overture.bio/documentation/guides/download/clientdownload/"
						rel="noopener noreferrer"
						target="_blank"
					>
						instructions
					</StyledLink>
					.
				</span>
			),
		},
	];

	useArrangerTheme(getTableConfigs({ apiHost: INTERNAL_API_PROXY.DEMO_ARRANGER, customExporters, theme }));

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
					<TableContextProvider>
						<Toolbar />
						<Table />
						<Pagination />
					</TableContextProvider>
				</article>
			</>
		),
		[],
	);
};

export default RepoTable;

