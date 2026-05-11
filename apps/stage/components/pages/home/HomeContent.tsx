import HeroBanner from '@/components/HeroBanner';
import HeroNodeCanvas from '@/components/HeroNodeCanvas';
import { css } from '@emotion/react';
import { ReactElement } from 'react';
import defaultTheme from '../../theme';
import HomeNavigation from './HomeNavigation';
import WelcomeBanner from './WelcomeBanner';

const heroBackground = (
	<div
		css={css`
			position: absolute;
			inset: 0;
			background: linear-gradient(125deg, #06131f 0%, #113052 45%, #0b4a6e 100%);
			pointer-events: none;
		`}
	>
		<HeroNodeCanvas />
		<div
			css={css`
				position: absolute;
				inset: 0;
				background: linear-gradient(to right, rgba(0, 0, 0, 0.5) 0%, rgba(0, 0, 0, 0.2) 55%, transparent 100%);
				pointer-events: none;
			`}
		/>
	</div>
);

const HomeContent = (): ReactElement => {
	return (
		<main
			css={css`
				background-color: ${defaultTheme.colors.grey_1};
				min-height: 100vh;
			`}
		>
			<WelcomeBanner disabled={true} />
			<HeroBanner
				title="Overture AI Development Portal"
				description="Building trustworthy AI workflows for discovery over shared research data"
				breadcrumbs={[{ label: 'Home', href: '/' }]}
				backgroundContent={heroBackground}
				fixed={false}
			/>
			<HomeNavigation />
		</main>
	);
};

export default HomeContent;
