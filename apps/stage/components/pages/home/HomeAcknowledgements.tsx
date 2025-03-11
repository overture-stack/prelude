import { css } from '@emotion/react';
import { ReactElement } from 'react';
import defaultTheme from '../../theme';

const HomeAcknowledgements = (): ReactElement => {
	return (
		<div
			css={css`
				background-color: ${defaultTheme.colors.white};
				border-radius: 8px;
				box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
				border: 1px solid ${defaultTheme.colors.grey_3};
				width: 100%;
			`}
		>
			<div
				css={css`
					padding: 24px;
					display: flex;
					flex-direction: column;
					justify-content: space-between;
					height: 100%;
				`}
			>
				<div>
					<h3
						css={css`
							font-size: 1.125rem;
							font-weight: 600;
							color: ${defaultTheme.colors.primary};
							margin-bottom: 16px;
							border-bottom: 1px solid ${defaultTheme.colors.grey_3};
							padding-bottom: 8px;
						`}
					>
						Acknowledgements
					</h3>
					<p
						css={css`
							font-size: 0.875rem;
							color: ${defaultTheme.colors.grey_6};
							margin-bottom: 16px;
						`}
					>
						The OICR Genome Informatics group built this portal using Overture, their open-source software suite that
						helps researchers organize, share, and explore their datasets.
					</p>
				</div>
				<a
					href="https://genome-informatics.oicr.on.ca/"
					target="_blank"
					rel="noopener noreferrer"
					css={css`
						display: inline-block;
						background-color: ${defaultTheme.colors.primary};
						color: ${defaultTheme.colors.white};
						text-decoration: none;
						padding: 10px 20px;
						border-radius: 6px;
						font-size: 0.875rem;
						font-weight: 600;
						text-align: center;
						transition: background-color 0.3s ease;
						align-self: flex-start;

						&:hover {
							background-color: ${defaultTheme.colors.primary}dd;
						}
					`}
				>
					Learn More
				</a>
			</div>
		</div>
	);
};

export default HomeAcknowledgements;
