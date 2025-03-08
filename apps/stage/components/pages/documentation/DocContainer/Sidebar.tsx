// components/documentation/Sidebar.tsx
import { css } from '@emotion/react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import theme from './theme';
import { SidebarSection } from './types';

interface SidebarProps {
	sections: SidebarSection[];
}

const Sidebar: React.FC<SidebarProps> = ({ sections }) => {
	const router = useRouter();
	const currentSlug = router.query.slug as string;

	const styles = {
		sidebar: css`
			width: 280px;
			min-width: 280px;
			background: ${theme.colors.sidebar};
			border-right: 1px solid ${theme.colors.border};
			position: sticky;
			top: 0;
			height: 100vh;
			overflow-y: auto;
			padding-top: 3.5rem;
			scrollbar-width: thin;
			scrollbar-color: ${theme.colors.primary} ${theme.colors.sidebar};
			flex-shrink: 0;
			align-self: flex-start;
			margin: 0;
			padding-left: 0;
			padding-right: 0;

			&::-webkit-scrollbar {
				width: 6px;
			}

			&::-webkit-scrollbar-track {
				background: ${theme.colors.sidebar};
			}

			&::-webkit-scrollbar-thumb {
				background-color: ${theme.colors.primary}80;
				border-radius: 6px;
			}

			@media (max-width: ${theme.breakpoints.md}) {
				position: relative;
				width: 100%;
				height: auto;
				top: 0;
				border-right: none;
				border-bottom: 1px solid ${theme.colors.border};
				padding: 0.5rem;
			}
		`,
		sidebarHeader: css`
			padding: 0 1.5rem 1rem;
			font-weight: 600;
			font-size: 0.875rem;
			text-transform: uppercase;
			letter-spacing: 0.05em;
			color: ${theme.colors.textSecondary};

			@media (max-width: ${theme.breakpoints.md}) {
				display: none;
			}
		`,
		nav: css`
			ul {
				list-style: none;
				padding: 0 0.5rem;
				margin: 0;
			}

			li {
				margin: 0.5rem 0;
			}

			a {
				display: block;
				padding: 0.75rem 1rem;
				color: ${theme.colors.textSecondary};
				text-decoration: none;
				font-size: 0.875rem;
				border-radius: 0.375rem;
				transition: ${theme.transitions.standard};
				border-left: 2px solid transparent;

				&:hover {
					color: ${theme.colors.primary};
					background: ${theme.colors.hover};
				}

				&.active {
					color: ${theme.colors.primary};
					background: ${theme.colors.hover};
					font-weight: 500;
					border-left: 2px solid ${theme.colors.primary};
				}
			}

			@media (max-width: ${theme.breakpoints.md}) {
				ul {
					display: flex;
					flex-wrap: wrap;
					gap: 0.75rem;
					padding: 0.5rem;
				}

				li {
					margin: 0;
				}

				a {
					padding: 0.5rem 1rem;
					border: 1px solid ${theme.colors.border};
					border-radius: 2rem;
					white-space: nowrap;

					&.active {
						border: 1px solid ${theme.colors.primary};
						background: ${theme.colors.primaryLight};
						border-left: 1px solid ${theme.colors.primary};
					}
				}
			}
		`,
	};

	return (
		<aside css={styles.sidebar}>
			<div css={styles.sidebarHeader}>Contents</div>
			<nav css={styles.nav}>
				<ul>
					{sections.map((section) => (
						<li key={section.id}>
							<Link href={`/documentation/${section.id}`} className={currentSlug === section.id ? 'active' : ''}>
								{section.title}
							</Link>
						</li>
					))}
				</ul>
			</nav>
		</aside>
	);
};

export default Sidebar;
