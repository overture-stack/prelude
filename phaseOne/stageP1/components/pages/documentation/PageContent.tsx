import { css } from '@emotion/react';
import { ReactElement } from 'react';
import HeroBanner from './HeroBanner';
import Docs from './Docs';

const PageContent = (): ReactElement => {
	return (
		<main
			css={(theme) => css`
				display: flex;
				flex-direction: column;
				padding-bottom: ${theme.dimensions.footer.height}px;
				background-color: ${theme.colors.main};
				min-height: 100vh;
				position: relative;
			`}
		>
			<article
				css={css`
					display: flex;
					justify-content: center;
					width: 100%;
					margin: 0 auto;
					padding: 0;
					position: relative;
					z-index: 1;
				`}
			>
				<Docs />
			</article>
		</main>
	);
};

export default PageContent;
