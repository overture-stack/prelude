import { css } from '@emotion/react';
import { ReactElement } from 'react';
import defaultTheme from '../../theme';

const HomeHero = (): ReactElement => {
	return (
		<section
			css={css`
				color: ${defaultTheme.colors.white};
				height: 120px;
				display: flex;
				align-items: center;
				padding: 0 16px;
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
						font-size: 1.5rem;
						margin-bottom: 8px;
						font-weight: 600;
						line-height: 1.2;
					`}
				>
					Home{' '}
				</h1>
				<p
					css={css`
						font-size: 0.875rem;
						line-height: 1.4;
						display: -webkit-box;
						-webkit-line-clamp: 2;
						-webkit-box-orient: vertical;
						overflow: hidden;
					`}
				>
					Incrementally build your Overture data platform with Prelude.
				</p>
			</div>
		</section>
	);
};

export default HomeHero;
