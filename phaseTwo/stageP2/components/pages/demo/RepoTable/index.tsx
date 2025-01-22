import { css, useTheme } from '@emotion/react';
import {
	Pagination,
	Table,
	TableContextProvider,
	Toolbar,
	useArrangerTheme,
} from '@overture-stack/arranger-components';
import { CustomExporterInput } from '@overture-stack/arranger-components/dist/Table/DownloadButton/types';
import { UseThemeContextProps } from '@overture-stack/arranger-components/dist/ThemeContext/types';
import { useMemo } from 'react';
import urlJoin from 'url-join';

import StyledLink from '@/components/Link';
import { StageThemeInterface } from '@/components/theme';
import { Download } from '@/components/theme/icons';
import { getConfig } from '@/global/config';

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
			columnTypes: {
				all: {
					cellValue: ({ getValue }) => {
						const value = getValue();
						return ['', null, 'null', undefined, 'undefined'].includes(value) ? (
							<span
								css={css`
									color: #9c9c9c;
								`}
							>
								--
							</span>
						) : (
							value
						);
					},
				},
			},
			CountDisplay: {
				fontColor: 'inherit',
			},
			DownloadButton: {
				customExporters,
				exportSelectedRowsField: 'submission_metadata.submitter_id',
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
				selectedBackground: theme.colors.accent_highlight,
				verticalBorderColor: theme.colors.grey_3,
			},
			TableWrapper: {
				margin: '0.5rem 0',
			},
		},
	},
});

const RepoTable = () => {
	const { NEXT_PUBLIC_ARRANGER_DEMO_API, NEXT_PUBLIC_ARRANGER_MANIFEST_COLUMNS } = getConfig();
	const theme = useTheme();

	const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');

	// Parse manifest columns from config
	const manifestColumns =
		NEXT_PUBLIC_ARRANGER_MANIFEST_COLUMNS?.split(',')
			.filter((field) => field.trim())
			.map((fieldName) => fieldName.replace(/['"]+/g, '').trim()) || [];

	const customExporters = [
		{ label: 'File Table', fileName: `demo-data-export.${today}.tsv` },
		{ label: 'File Manifest', fileName: `score-manifest.${today}.tsv`, columns: manifestColumns },
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

	useArrangerTheme(getTableConfigs({ apiHost: NEXT_PUBLIC_ARRANGER_DEMO_API, customExporters, theme }));

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
