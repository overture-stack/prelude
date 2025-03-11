// components/documentation/Layout.tsx
import { css } from '@emotion/react';
import { useEffect, useState } from 'react';
import Sidebar from './Sidebar';
import theme from './theme';
import { SidebarSection } from './types';

interface LayoutProps {
	children: React.ReactNode;
	sections: SidebarSection[];
}

const Layout: React.FC<LayoutProps> = ({ children, sections }) => {
	const [sidebarOpen, setSidebarOpen] = useState(false);
	const [isMobile, setIsMobile] = useState(false);

	// Check if we're on mobile for responsive behavior
	useEffect(() => {
		const checkIfMobile = () => {
			const mqList = window.matchMedia(`(max-width: ${theme.breakpoints.md.replace('px', '')}px)`);
			setIsMobile(mqList.matches);
		};

		checkIfMobile();
		window.addEventListener('resize', checkIfMobile);
		return () => window.removeEventListener('resize', checkIfMobile);
	}, []);

	// Handle body overflow when sidebar is open on mobile
	useEffect(() => {
		if (isMobile) {
			if (sidebarOpen) {
				document.body.style.overflow = 'hidden';
			} else {
				document.body.style.overflow = '';
			}
		}

		return () => {
			document.body.style.overflow = '';
		};
	}, [sidebarOpen, isMobile]);

	return (
		<div
			css={css`
				display: flex;
				width: 100%;
				min-height: 100vh;
				position: relative;
			`}
		>
			{/* Sidebar for desktop */}
			<Sidebar sections={sections} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

			{/* Main content area */}
			<main
				css={css`
					flex: 1;
					padding: 1.5rem 2.5rem 3rem;
					width: calc(100% - 280px);
					margin-left: ${isMobile ? '0' : '280px'};
					box-sizing: border-box;

					/* Tablet adjustments */
					@media (min-width: ${theme.breakpoints.md}) and (max-width: ${theme.breakpoints.lg}) {
						width: calc(100% - 240px);
						margin-left: 240px;
						padding: 1.5rem 1.5rem 3rem;
					}

					/* Mobile adjustments */
					@media (max-width: ${theme.breakpoints.md}) {
						width: 100%;
						margin-left: 0;
						padding: 1.5rem 1rem 3rem;
					}
				`}
			>
				{children}
			</main>

			{/* Mobile sidebar toggle button */}
			<button
				css={css`
					display: none;
					position: fixed;
					bottom: 20px;
					right: 20px;
					background: ${theme.colors.primary};
					color: white;
					width: 50px;
					height: 50px;
					border-radius: 50%;
					border: none;
					box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
					z-index: 1001;
					cursor: pointer;
					align-items: center;
					justify-content: center;
					transition: ${theme.transitions.standard};

					&:hover {
						background: #09638a;
					}

					svg {
						width: 24px;
						height: 24px;
					}

					@media (max-width: ${theme.breakpoints.md}) {
						display: flex;
					}
				`}
				onClick={() => setSidebarOpen(true)}
				aria-label="Open sidebar"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round"
				>
					<line x1="3" y1="12" x2="21" y2="12"></line>
					<line x1="3" y1="6" x2="21" y2="6"></line>
					<line x1="3" y1="18" x2="21" y2="18"></line>
				</svg>
			</button>

			{/* Mobile sidebar overlay */}
			{isMobile && (
				<div
					css={css`
						display: ${sidebarOpen ? 'block' : 'none'};
						position: fixed;
						top: 0;
						left: 0;
						right: 0;
						bottom: 0;
						background: rgba(0, 0, 0, 0.5);
						z-index: 999;
						opacity: ${sidebarOpen ? 1 : 0};
						transition: opacity 0.3s ease;
					`}
					onClick={() => setSidebarOpen(false)}
					aria-hidden="true"
				/>
			)}
		</div>
	);
};

export default Layout;
