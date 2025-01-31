import { css } from '@emotion/react';
import { ReactElement } from 'react';
import defaultTheme from '../../theme';

const styles = {
	container: css`
		background-color: ${defaultTheme.colors.white};
		padding: 2rem;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
		margin-top: 2rem;
		min-height: 415px;
		border-radius: 5px;

		@media (max-width: 884px) {
			margin-top: -3rem;
			margin-bottom: 2rem;
			min-height: 0px;
		}
	`,
	title: css`
		font-size: 1.5rem;
		font-weight: 700;
		color: ${defaultTheme.colors.button};
		margin-bottom: 2rem;
	`,
	text: css`
		font-size: 1rem;
		color: ${defaultTheme.colors.black};
		margin-bottom: 1.5rem;
		opacity: 0.8;
	`,
	ctaButton: css`
		display: inline-block;
		padding: 1rem 2rem;
		background-color: ${defaultTheme.colors.button};
		color: ${defaultTheme.colors.white};
		text-decoration: none;
		font-weight: 900;
		border-radius: 5px;
		transition: transform 0.3s ease;
		margin-top: 1rem;

		&:hover {
			transform: translateY(-2px);
		}
	`,
};

const Support = (): ReactElement => (
	<div css={styles.container}>
		<h2 css={styles.title}>Need Help?</h2>
		<p css={styles.text}>
			Reach out through our{' '}
			<a href="https://docs.overture.bio/community/support" target="_blank" rel="noopener">
				community support channels
			</a>
			. Using public support channels helps us track issues and filenstrates active community engagement, a key
			indicator of project health.
		</p>
		<p css={styles.text}>For business inquiries contact us by email at contact@overture.bio</p>
		<a
			href="https://github.com/overture-stack/docs/discussions/categories/support"
			target="_blank"
			rel="noopener noreferrer"
			css={styles.ctaButton}
		>
			Get Help
		</a>
	</div>
);

export default Support;
