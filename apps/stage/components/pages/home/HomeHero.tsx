import { css } from '@emotion/react';
import { ReactElement } from 'react';
import defaultTheme from '../../theme';

const HomeHero = (): ReactElement => {
	return (
		<section
			css={css`
				background-color: ${defaultTheme.colors.hero};
				color: ${defaultTheme.colors.white};
				padding: 32px 16px;
				text-align: left;
			`}
		>
			<div
				css={css`
					max-width: 1550px;
					margin: 0 auto;
					width: 90%;
				`}
			>
				<h1
					css={css`
						font-size: 2rem;
						margin-bottom: 16px;
						font-weight: 600;
					`}
				>
					Prelude Documentation
				</h1>
				<p
					css={css`
						font-size: 1rem;
						line-height: 1.6;
					`}
				>
					Learn how to incrementally build your data platform with Prelude. Explore our comprehensive guides and
					resources.
				</p>
			</div>
		</section>
	);
};

export default HomeHero;
