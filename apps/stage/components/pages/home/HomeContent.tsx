import HeroBanner from '@/components/HeroBanner';
import { css } from '@emotion/react';
import { ReactElement } from 'react';
import defaultTheme from '../../theme';
import HomeNavigation from './HomeNavigation';

const HomeContent = (): ReactElement => {
	return (
		<main
			css={css`
				background-color: ${defaultTheme.colors.grey_1};
				min-height: 100vh;
			`}
		>
			<HeroBanner
				title="Prelude"
				description="Version 1.0.0-beta"
				breadcrumbs={[{ label: 'Home', href: '/' }]}
				fixed={false}
			/>
			<HomeNavigation />
		</main>
	);
};

export default HomeContent;
