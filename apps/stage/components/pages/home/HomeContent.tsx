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
				description="Incrementally build your Overture data platform"
				breadcrumbs={[{ label: 'Home', href: '/' }]}
				fixed={false}
			/>
			<HomeNavigation />
		</main>
	);
};

export default HomeContent;
