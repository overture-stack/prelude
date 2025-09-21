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
				title="Search & Exploration Demo"
				description="Version 1-beta"
				breadcrumbs={[{ label: 'Home', href: '/' }]}
				fixed={false}
			/>
			<HomeNavigation />
		</main>
	);
};

export default HomeContent;
