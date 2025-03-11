import { css } from '@emotion/react';
import { ReactElement } from 'react';
import defaultTheme from '../../theme';
import HomeHero from './HomeHero';
import HomeNavigation from './HomeNavigation';

const HomeContent = (): ReactElement => {
	return (
		<main
			css={css`
				background-color: ${defaultTheme.colors.grey_1};
				min-height: 100vh;
			`}
		>
			<HomeHero />
			<HomeNavigation />
		</main>
	);
};

export default HomeContent;
