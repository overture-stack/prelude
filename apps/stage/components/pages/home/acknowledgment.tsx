import { css } from '@emotion/react';
import { ReactElement } from 'react';
import defaultTheme from '../../theme';

const styles = {
	container: css`
		background-color: ${defaultTheme.colors.white};
		padding: 2rem;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
		margin-top: 2rem;
		border-radius: 5px;

		@media (max-width: 884px) {
			margin-top: -3rem;
			margin-bottom: 2rem;
			padding-bottom: 20px;
		}
	`,
	title: css`
		font-size: 1.5rem;
		font-weight: 700;
		color: ${defaultTheme.colors.button};
	`,
	text: css`
		font-size: 1rem;
		color: ${defaultTheme.colors.black};
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
		<a href="https://genome-informatics.oicr.on.ca/" target="_blank" rel="noopener noreferrer" css={styles.ctaButton}>
			Learn More
		</a>
	</div>
);

export default Acknowledgment;
