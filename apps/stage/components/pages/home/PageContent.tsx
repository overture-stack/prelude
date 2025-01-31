import { css } from '@emotion/react';
import { ReactElement } from 'react';
import Acknowledgment from './acknowledgment';
import HeroBanner from './HeroBanner';
import SiteMap from './SiteMap';
import Support from './support';

const styles = {
	pageContainer: css`
		display: flex;
		gap: 2rem;
		padding: 0 50px;

		@media (max-width: 884px) {
			flex-direction: column;
			gap: 1rem;
		}
	`,
	mainContent: css`
		flex: 1;
	`,
	sidebar: css`
		width: 300px;
		align-self: flex-start;

		@media (max-width: 884px) {
			width: 100%;
		}
	`,
	acknowledgmentSection: css`
		width: 100%;
		margin-top: -60px;

		@media (max-width: 884px) {
			margin-top: 50px;
		}
	`,
};

const PageContent = (): ReactElement => {
	return (
		<main
			css={(theme) => css`
				display: flex;
				flex-direction: column;
				padding-bottom: ${theme.dimensions.footer.height}px;
				background-color: ${theme.colors.main};
			`}
		>
			<HeroBanner />
			<div css={styles.pageContainer}>
				<div css={styles.mainContent}>
					<SiteMap />
				</div>
				<div css={styles.sidebar}>
					<Support />
				</div>
			</div>
			<div css={styles.pageContainer}>
				<div css={styles.acknowledgmentSection}>
					<Acknowledgment />
				</div>
			</div>
		</main>
	);
};

export default PageContent;
