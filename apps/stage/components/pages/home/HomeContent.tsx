import HeroBanner from '@/components/HeroBanner';
import { css } from '@emotion/react';
import { ReactElement } from 'react';
import defaultTheme from '../../theme';
import HomeNavigation from './HomeNavigation';
import WelcomeBanner from './WelcomeBanner';

const HomeContent = (): ReactElement => {
	return (
		<main
			css={css`
				background-color: ${defaultTheme.colors.grey_1};
				min-height: 100vh;
			`}
		>
			<WelcomeBanner />
			<HeroBanner
				title="File Management Demo"
				description="Explore and manage your file data"
				breadcrumbs={[{ label: 'Home', href: '/' }]}
				fixed={false}
			/>
			<HomeNavigation />
		</main>
	);
};

export default HomeContent;
