// components/documentation/Sidebar.tsx
import { css } from '@emotion/react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import theme from './theme';
import { SidebarSection } from './types';

interface SidebarProps {
	sections: SidebarSection[];
	isOpen?: boolean; // For mobile toggle
	onClose?: () => void; // For mobile close button
	headerHeight?: number; // Total height of navbar + hero
}

const Sidebar: React.FC<SidebarProps> = ({ sections, isOpen = false, onClose, headerHeight = 210 }) => {
	const router = useRouter();
	const currentSlug = router.query.slug as string;
	const [isMobile, setIsMobile] = useState(false);

	// Check if we're on mobile
	useEffect(() => {
		const checkIfMobile = () => {
			const mqList = window.matchMedia(`(max-width: ${theme.breakpoints.md.replace('px', '')}px)`);
			setIsMobile(mqList.matches);
		};

		checkIfMobile();
		window.addEventListener('resize', checkIfMobile);
		return () => window.removeEventListener('resize', checkIfMobile);
	}, []);

	return (
		<aside
			css={css`
				width: 280px;
				min-width: 280px;
				background: ${theme.colors.sidebar};
				border-right: 1px solid ${theme.colors.border};
				position: fixed;
				top: 160px;
				left: 0;
				height: calc(100vh - ${headerHeight}px);
				overflow-y: auto;
				padding: 1.5rem 0;
				z-index: 10;
				flex-shrink: 0;
				scrollbar-width: thin;
				scrollbar-color: ${theme.colors.primary} ${theme.colors.sidebar};

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

				/* Tablet-specific adjustments */
				@media (min-width: ${theme.breakpoints.md}) and (max-width: ${theme.breakpoints.lg}) {
					width: 240px;
					min-width: 240px;
				}

				/* Mobile adjustments */
				@media (max-width: ${theme.breakpoints.md}) {
					position: fixed;
					top: 0; // For mobile, start from the top
					left: 0;
					bottom: 0;
					transform: ${isOpen ? 'translateX(0)' : 'translateX(-100%)'};
					width: 85%;
					max-width: 300px;
					height: 100vh; // Full height for mobile
					box-shadow: 0 0 15px rgba(0, 0, 0, 0.1);
					padding-top: 1rem;
					transition: transform 0.3s ease;
				}
			`}
			className={isOpen ? 'active' : ''}
		>
			<div
				css={css`
					padding: 0 1.5rem 1rem;
					font-weight: 600;
					font-size: 0.875rem;
					text-transform: uppercase;
					letter-spacing: 0.05em;
					color: ${theme.colors.textSecondary};
					display: flex;
					justify-content: space-between;
					align-items: center;

					.close-button {
						display: none;
						background: transparent;
						border: none;
						color: ${theme.colors.textSecondary};
						cursor: pointer;
						padding: 5px;

						&:hover {
							color: ${theme.colors.primary};
						}

						svg {
							width: 20px;
							height: 20px;
						}
					}

					@media (max-width: ${theme.breakpoints.md}) {
						.close-button {
							display: block;
						}
					}
				`}
			>
				Contents
				{isMobile && (
					<button className="close-button" onClick={onClose} aria-label="Close sidebar">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
							strokeLinejoin="round"
						>
							<line x1="18" y1="6" x2="6" y2="18"></line>
							<line x1="6" y1="6" x2="18" y2="18"></line>
						</svg>
					</button>
				)}
			</div>
			<nav
				css={css`
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

					/* Keep vertical navigation on mobile */
					@media (max-width: ${theme.breakpoints.md}) {
						ul {
							padding: 0 0.5rem;
						}

						li {
							margin: 0.25rem 0;
						}

						a {
							padding: 0.75rem 0.75rem;
						}
					}
				`}
			>
				<ul>
					{sections.map((section) => (
						<li key={section.id}>
							<Link
								href={`/documentation/${section.id}`}
								className={currentSlug === section.id ? 'active' : ''}
								onClick={isMobile ? onClose : undefined}
							>
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
