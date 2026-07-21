// components/NavBar/NavBar.tsx
import { css, useTheme } from '@emotion/react';
import { createRef, ReactElement } from 'react';

import { getConfig } from '../../global/config';
import {
	ARRANGER_GQL_CORRELATION,
	ARRANGER_GQL_EXPRESSION,
	ARRANGER_GQL_MUTATION,
	ARRANGER_GQL_PROTEIN,
	ARRANGER_INTROSPECTION,
	ARRANGER_INTROSPECTION_CORRELATION,
	ARRANGER_INTROSPECTION_EXPRESSION,
	ARRANGER_INTROSPECTION_MUTATION,
	ARRANGER_INTROSPECTION_PROTEIN,
	ARRANGER_INTROSPECTION_SQON,
	INTERNAL_PATHS,
} from '../../global/utils/constants';
import { InternalLink } from '../Link';
import defaultTheme from '../theme';

import labIcon from '@/public/images/navbar-logo.png';
import DataTablesDropdown from './DataTablesDropdown';
import DocumentationDropdown from './DocumentationDropdown';
import Dropdown from './Dropdown';
import FlyoutMenuItem from './FlyoutMenuItem';
import { StyledListLink } from './styles';

export const navBarRef = createRef<HTMLDivElement>();

const NavBar = (): ReactElement => {
	const theme: typeof defaultTheme = useTheme();
	const { NEXT_PUBLIC_LAB_NAME } = getConfig();

	return (
		<div
			ref={navBarRef}
			css={css`
				display: flex;
				justify-content: flex-start;
				height: ${theme.dimensions.navbar.height}px;
				background: ${theme.colors.white};
				background-size: 281px;
				${theme.shadow.default};
				position: fixed;
				top: 0;
				left: 0;
				z-index: 666;
				width: 100%;
				min-width: 100%;
				max-width: 100vw;
				box-sizing: border-box;
			`}
		>
			<div
				css={css`
					display: flex;
					align-items: center;
					margin-left: 16px;
					cursor: pointer;
				`}
			>
				<InternalLink path={INTERNAL_PATHS.HOME}>
					<a
						css={(theme) => css`
							display: flex;
							align-items: center;
							text-decoration: none;
							${theme.typography.heading};
							color: ${theme.colors.accent_dark};
						`}
					>
						<img
							src={labIcon.src}
							alt="Prelude Logo"
							css={css`
								width: ${theme.dimensions.labIcon.width}px;
								height: auto;
								margin-left: 30px;
								@media (max-width: 425px) {
									display: none;
								}
							`}
						/>
						<span
							css={css`
								color: ${theme.colors.black};
								text: ${theme.typography.button};
								padding-left: 30px;
								white-space: nowrap;
								@media (max-width: 884px) {
									display: none;
								}
							`}
						>
							{NEXT_PUBLIC_LAB_NAME}
						</span>
					</a>
				</InternalLink>
			</div>
			<div
				css={css`
					display: flex;
					margin-left: 30px;
					margin-top: 0px;
					align-items: center;
					justify-content: space-between;
					width: 100%;
					a {
						text-decoration: none;
					}
				`}
			>
				<div
					css={css`
						display: flex;
						align-items: center;
						height: 100%;
						width: 100%;
						color: ${theme.colors.black};
					`}
				>
					<div
						css={(theme) => css`
							display: flex;
							align-items: center;
							justify-content: center;
							width: 144px;
							background-color: ${theme.colors.white};
							height: 100%;
							&:hover {
								background-color: ${theme.colors.grey_2};
							}
							border-right: 2px solid ${theme.colors.white};
							margin: 0;
						`}
					>
						<DataTablesDropdown />
					</div>
					<div
						css={(theme) => css`
							display: flex;
							align-items: center;
							justify-content: center;
							width: 144px;
							background-color: ${theme.colors.white};
							height: 100%;
							&:hover {
								background-color: ${theme.colors.grey_2};
							}
							border-right: 2px solid ${theme.colors.white};
							margin: 0;
						`}
					>
						<InternalLink path={INTERNAL_PATHS.DONOR_TABLE}>
							<a
								css={css`
									width: 100%;
									height: 100%;
									display: flex;
									align-items: center;
									justify-content: center;
									color: ${theme.colors.accent_dark};
									font-size: 14px;
									font-weight: bold;
									text-decoration: none;
									cursor: pointer;
								`}
							>
								Clinical Data
							</a>
						</InternalLink>
					</div>
					<div
						css={(theme) => css`
							display: flex;
							align-items: center;
							justify-content: center;
							width: 160px;
							background-color: ${theme.colors.white};
							height: 100%;
							&:hover {
								background-color: ${theme.colors.grey_2};
							}
							border-right: 2px solid ${theme.colors.white};
							margin: 0;
						`}
					>
						<DocumentationDropdown />
					</div>
					<div
						css={(theme) => css`
							display: flex;
							align-items: center;
							justify-content: center;
							width: 180px;
							background-color: ${theme.colors.white};
							height: 100%;
							&:hover {
								background-color: ${theme.colors.grey_2};
							}
							border-right: 2px solid ${theme.colors.white};
							margin: 0;
						`}
					>
						<Dropdown
							css={css`
								width: 100%;
								height: 100%;
								display: flex;
								align-items: center;
								justify-content: center;
								color: ${theme.colors.accent_dark};
								font-size: 14px;
								font-weight: bold;
							`}
							data={[
								<StyledListLink href={ARRANGER_INTROSPECTION} target="_blank" rel="noopener noreferrer">
									Server Introspection
								</StyledListLink>,
								<StyledListLink href={ARRANGER_INTROSPECTION_SQON} target="_blank" rel="noopener noreferrer">
									SQON Introspection
								</StyledListLink>,
								<FlyoutMenuItem
									label="Field Definitions"
									items={[
										{ label: 'Correlation', href: ARRANGER_INTROSPECTION_CORRELATION },
										{ label: 'Mutation', href: ARRANGER_INTROSPECTION_MUTATION },
										{ label: 'Expression', href: ARRANGER_INTROSPECTION_EXPRESSION },
										{ label: 'Protein', href: ARRANGER_INTROSPECTION_PROTEIN },
									]}
								/>,
								<FlyoutMenuItem
									label="GraphQL Playground"
									items={[
										{ label: 'Correlation', href: ARRANGER_GQL_CORRELATION },
										{ label: 'Mutation', href: ARRANGER_GQL_MUTATION },
										{ label: 'Expression', href: ARRANGER_GQL_EXPRESSION },
										{ label: 'Protein', href: ARRANGER_GQL_PROTEIN },
									]}
								/>,
							]}
							label="Developer Tools"
							urls={[]}
						/>
					</div>
				</div>

			</div>
		</div>
	);
};

export default NavBar;
