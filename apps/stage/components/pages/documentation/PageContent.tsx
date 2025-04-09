// components/pages/documentation/PageContent.tsx
import { css } from '@emotion/react';
import { ReactElement } from 'react';
import DocsContainer from './DocContainer';
import theme from './DocContainer/theme';

const PageContent = (): ReactElement => {
	return (
		<main
			css={css`
				display: flex;
				flex-direction: column;
				min-height: 100vh;
				width: 100%;
				max-width: 100%;
			`}
		>
			<article
				css={css`
					display: flex;
					justify-content: center;
					width: 100%;
					max-width: 100%;
					margin: 0;
					padding: 0;
					flex: 1;
					background-color: ${theme.colors.background};
				`}
			>
				<DocsContainer />
			</article>
		</main>
	);
};

export default PageContent;
