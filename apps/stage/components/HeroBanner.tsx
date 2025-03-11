// components/HeroBanner.tsx
import { css, useTheme } from '@emotion/react';
import Link from 'next/link';
import { ReactElement, useEffect, useState } from 'react';

// Define the breadcrumb item interface
export interface BreadcrumbItem {
	label: string;
	href?: string;
}

// Define the component props interface
export interface HeroBannerProps {
	title: string;
	description?: string;
	breadcrumbs?: BreadcrumbItem[];
	backgroundColor?: string;
	textColor?: string;
	height?: number;
	fixed?: boolean;
}

const HeroBanner = ({
	title,
	description,
	breadcrumbs = [],
	backgroundColor = '#0B75A2',
	textColor = '#ffffff',
	height = 120,
	fixed = true,
}: HeroBannerProps): ReactElement => {
	const theme = useTheme();
	// Use useState to properly handle the navbar height
	const [navbarHeight, setNavbarHeight] = useState(
		// Initialize with theme value if available, otherwise default to 0
		theme?.dimensions?.navbar?.height || 0,
	);

	// Measure the actual navbar height
	useEffect(() => {
		const measureNavbar = () => {
			const navbar = document.querySelector('nav') || document.querySelector('header > div:first-child');
			if (navbar) {
				const navHeight = navbar.getBoundingClientRect().height;
				if (navHeight > 0) {
					setNavbarHeight(navHeight);
				}
			}
		};

		// Initial measurement after component mounts
		measureNavbar();

		// Re-measure on window resize
		window.addEventListener('resize', measureNavbar);
		return () => window.removeEventListener('resize', measureNavbar);
	}, []);

	// Responsive height adjustments
	const mobileHeight = height - 10;
	const smallMobileHeight = height - 20;

	return (
		<article
			className="hero-banner"
			data-hero="true"
			css={css`
				background-color: ${backgroundColor};
				box-sizing: border-box;
				color: ${textColor};
				display: flex;
				padding: 20px;
				width: 100%;
				justify-content: center;
				margin: 0;
				position: ${fixed ? 'fixed' : 'relative'};
				top: 50px;
				left: 0;
				right: 0;
				z-index: 100;
				height: ${height}px;

				@media (max-width: 768px) {
					padding: 15px;
					height: ${mobileHeight}px;
				}

				@media (max-width: 480px) {
					padding: 12px 15px;
					height: ${smallMobileHeight}px;
				}
			`}
		>
			<section
				css={css`
					display: flex;
					flex-direction: column;
					justify-content: space-between;
					width: 100%;
					max-width: 1400px;

					> * {
						margin: 0;
					}
				`}
			>
				{breadcrumbs.length > 0 && (
					<div
						css={css`
							display: flex;
							align-items: center;
							margin-bottom: 6px;
							font-size: 14px;

							a {
								color: rgba(255, 255, 255, 0.9);
								text-decoration: none;
								transition: color 0.2s ease;

								&:hover {
									color: white;
									text-decoration: underline;
								}
							}

							span {
								display: flex;
								align-items: center;
								color: rgba(255, 255, 255, 0.9);

								&:not(:last-child)::after {
									content: '/';
									margin: 0 8px;
									color: rgba(255, 255, 255, 0.7);
								}
							}
						`}
					>
						{breadcrumbs.map((crumb, index) => (
							<span key={index}>{crumb.href ? <Link href={crumb.href}>{crumb.label}</Link> : crumb.label}</span>
						))}
					</div>
				)}
				<h1
					css={css`
						font-size: 26px;
						font-weight: 600;
						position: relative;
						margin: 0;

						@media (min-width: 1345px) {
							font-size: 30px;
						}

						@media (max-width: 768px) {
							font-size: 24px;
						}

						@media (max-width: 480px) {
							font-size: 20px;
						}
					`}
				>
					{title}
				</h1>
				{description && (
					<p
						css={css`
							font-size: 15px;
							margin-top: 6px;
							font-weight: normal;
							max-width: 650px;
							opacity: 0.9;

							@media (max-width: 768px) {
								font-size: 14px;
								margin-top: 4px;
							}

							@media (max-width: 480px) {
								font-size: 13px;
								margin-top: 3px;
							}
						`}
					>
						{description}
					</p>
				)}
			</section>
		</article>
	);
};

export default HeroBanner;
