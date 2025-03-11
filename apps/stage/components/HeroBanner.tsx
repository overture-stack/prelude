// components/HeroBanner.tsx
import { css } from '@emotion/react';
import Link from 'next/link';
import { ReactElement } from 'react';

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
	return (
		<article
			className="hero-banner"
			data-hero="true"
			css={css`
				background-color: ${backgroundColor};
				box-sizing: border-box;
				color: ${textColor};
				display: flex;
				justify-content: flex-start;
				align-items: center;
				width: 100%;
				height: ${height}px;
				padding: 20px;
				position: ${fixed ? 'fixed' : 'relative'};
				top: ${fixed ? '60' : 'auto'};
				left: 0;
				right: 0;
				z-index: 100;

				@media (max-width: 768px) {
					padding: 15px;
					height: ${height - 10}px;
				}

				@media (max-width: 480px) {
					padding: 12px 15px;
					height: ${height - 20}px;
				}
			`}
		>
			<section
				css={css`
					display: flex;
					flex-direction: column;
					width: 100%;
					max-width: 1550px;
					padding-left: 1.5rem;

					@media (max-width: 768px) {
						padding-left: 1rem;
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
							margin-bottom: 0;
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
