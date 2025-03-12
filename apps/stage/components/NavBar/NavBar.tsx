// components/NavBar/NavBar.tsx
import { css, useTheme } from '@emotion/react';
import cx from 'classnames';
import { useRouter } from 'next/router';
import { createRef, ReactElement } from 'react';

import { getConfig } from '../../global/config';
import useAuthContext from '../../global/hooks/useAuthContext';
import { INTERNAL_PATHS, LOGIN_PATH, USER_PATH } from '../../global/utils/constants';
import { InternalLink, StyledLinkAsButton } from '../Link';
import defaultTheme from '../theme';
import UserDropdown from '../UserDropdown';

import labIcon from '@/public/images/navbar-logo.png';
import DataTablesDropdown from './DataTablesDropdown';
import DocumentationDropdown from './DocumentationDropdown';
import Dropdown from './Dropdown';
import { linkStyles, StyledListLink } from './styles';

export const navBarRef = createRef<HTMLDivElement>();

const NavBar = (): ReactElement => {
	const router = useRouter();
	const theme: typeof defaultTheme = useTheme();
	const { user } = useAuthContext();
	const { NEXT_PUBLIC_AUTH_PROVIDER, NEXT_PUBLIC_LAB_NAME } = getConfig();

	const activeLinkStyle = `
    background-color: ${theme.colors.grey_2};
    color: ${theme.colors.accent2_dark};
  `;

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
					<DataTablesDropdown />
					<DocumentationDropdown />
					<Dropdown
						css={linkStyles}
						data={[
							<InternalLink path={INTERNAL_PATHS.LYRIC}>
								<StyledListLink className={cx({ active: router.asPath.startsWith(INTERNAL_PATHS.LYRIC) })}>
									Lyric API
								</StyledListLink>
							</InternalLink>,
							<InternalLink path={INTERNAL_PATHS.LECTERN}>
								<StyledListLink className={cx({ active: router.asPath.startsWith(INTERNAL_PATHS.LECTERN) })}>
									Lectern API
								</StyledListLink>
							</InternalLink>,
							<InternalLink path={INTERNAL_PATHS.SONG}>
								<StyledListLink className={cx({ active: router.asPath.startsWith(INTERNAL_PATHS.SONG) })}>
									Song API
								</StyledListLink>
							</InternalLink>,
							<InternalLink path={INTERNAL_PATHS.SCORE}>
								<StyledListLink className={cx({ active: router.asPath.startsWith(INTERNAL_PATHS.SCORE) })}>
									Score API
								</StyledListLink>
							</InternalLink>,
						]}
						label="APIs"
					/>
				</div>

				{/* Auth Section */}
				{NEXT_PUBLIC_AUTH_PROVIDER && (
					<div
						css={css`
							display: flex;
							align-items: center;
							margin-right: 16px;
						`}
					>
						{user ? (
							<div
								css={(theme) => css`
									width: 195px;
									height: ${theme.dimensions.navbar.height}px;
									position: relative;
									display: flex;
									${router.pathname === USER_PATH ? activeLinkStyle : ''}
									&:hover {
										background-color: ${theme.colors.grey_2};
									}
								`}
							>
								<UserDropdown />
							</div>
						) : (
							<div
								css={css`
									width: 145px;
									display: flex;
									align-items: center;
									justify-content: center;
								`}
							>
								<InternalLink path={LOGIN_PATH}>
									<StyledLinkAsButton
										css={(theme) => css`
											width: 70px;
											${theme.typography.button};
											line-height: 20px;
										`}
									>
										Log in
									</StyledLinkAsButton>
								</InternalLink>
							</div>
						)}
					</div>
				)}
			</div>
		</div>
	);
};

export default NavBar;
