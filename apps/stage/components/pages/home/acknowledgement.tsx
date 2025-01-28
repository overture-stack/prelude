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

		@media (max-width: 768px) {
			margin-top: -3rem;
			margin-bottom: 2rem;
			min-height: 325px;
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

const Acknowledgment = (): ReactElement => (
	<div css={styles.container}>
		<h2 css={styles.title}>Acknowledgements</h2>
		<p css={styles.text}>
			The OICR Genome Informatics group built this portal using Overture, their open-source software suite that helps
			researchers organize, share, and explore their datasets.
		</p>
		<p css={styles.text}>Want to improve your data management?</p>
		<p css={styles.text}>Email contact@overture.bio</p>
		<a href="https://www.overture.bio/" target="_blank" rel="noopener noreferrer" css={styles.ctaButton}>
			Learn More
		</a>
	</div>
);

export default Acknowledgment;
