import { css } from '@emotion/react';
import { ReactElement } from 'react';
import DocsContainer from './DocContainer';
import HeroBanner from './HeroBanner';

const PageContent = (): ReactElement => {
	return (
		<main>
			<HeroBanner />
			<article
				css={css`
					display: flex;
					justify-content: center;
					width: 100%;
					margin: 0;
					padding: 0;
				`}
			>
				<DocsContainer />
			</article>
		</main>
	);
};

export default PageContent;
