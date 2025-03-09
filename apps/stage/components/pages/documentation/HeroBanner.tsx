// HeroBanner.tsx - Updated for the fixed layout approach
import { css, useTheme } from '@emotion/react';
import Link from 'next/link';
import { ReactElement } from 'react';
import defaultTheme from '../../theme';

const styles = {
	article: css`
		background-color: ${defaultTheme.colors.hero};
		box-sizing: border-box;
		color: ${defaultTheme.colors.white};
		display: flex;
		padding: 20px;
		width: 100%;
		justify-content: center;
		margin: 0;

		@media (max-width: 768px) {
			padding: 15px;
		}

		@media (max-width: 480px) {
			padding: 12px 15px;
		}
	`,
	section: css`
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		width: 100%;
		max-width: 1400px;

		> * {
			margin: 0;
		}
	`,
	breadcrumbs: css`
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
	`,
	title: css`
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
	`,
	subtitle: css`
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
	`,
};

const HeroBanner = (): ReactElement => {
	const theme: typeof defaultTheme = useTheme();

	return (
		<article css={styles.article}>
			<section css={styles.section}>
				<div css={styles.breadcrumbs}>
					<span>
						<Link href="/">
							<a>Home</a>
						</Link>
					</span>
					<span>Documentation</span>
				</div>
				<h1 css={styles.title}>Documentation</h1>
				<p css={styles.subtitle}>Learn how to use Prelude to incrementally build your data platform</p>
			</section>
		</article>
	);
};

export default HeroBanner;
