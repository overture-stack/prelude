import { css } from '@emotion/react';
import { ReactElement, useState } from 'react';
import { INTERNAL_PATHS } from '../../../global/utils/constants';
import defaultTheme from '../../theme';
import HomeAcknowledgements from './HomeAcknowledgements';
import HomeCommunityResources from './HomeCommunityResources';

interface CardItem {
	title: string;
	link: string;
	description: string;
	subItems?: { title: string; link: string }[];
	external?: boolean;
}

const homeCards: CardItem[] = [
	{
		title: 'Explore the Data',
		link: '#',
		description: 'Browse and interact with datasets',
		subItems: [
			{ title: 'Clnical Data', link: INTERNAL_PATHS.TABULAR },
			{ title: 'Moelecular Data', link: INTERNAL_PATHS.FILE },
		],
	},
	{
		title: 'Documentation & Guides',
		link: INTERNAL_PATHS.DOCUMENTATION,
		description: 'Phased guides covering Prelude usage',
	},
	{
		title: 'Find Support',
		link: 'https://docs.overture.bio/community/support',
		description: 'Connect with our community and get help',
		external: true,
	},
];

const HomeNavigation = (): ReactElement => {
	const [openDropdown, setOpenDropdown] = useState<number | null>(null);

	const handleCardClick = (card: CardItem, index: number, e: React.MouseEvent) => {
		// Prevent default for dropdown or external links
		if (card.subItems) {
			e.preventDefault();
			setOpenDropdown(openDropdown === index ? null : index);
		} else if (card.external) {
			// Open external links in new tab
			window.open(card.link, '_blank', 'noopener,noreferrer');
		} else {
			// Internal navigation
			e.preventDefault();
			window.location.href = card.link;
		}
	};

	const handleSubItemClick = (subItem: { title: string; link: string }, e: React.MouseEvent) => {
		// Prevent default for internal navigation
		e.preventDefault();
		window.location.href = subItem.link;
	};

	return (
		<div
			css={css`
				max-width: 1550px;
				width: 90%;
				margin: 0 auto;
				padding: 32px 16px 0;
				padding-bottom: 64px; // Ensure bottom padding
			`}
		>
			<div
				css={css`
					display: grid;
					grid-template-columns: repeat(3, 1fr);
					gap: 24px;

					@media (max-width: 1024px) {
						grid-template-columns: 1fr 1fr;
					}

					@media (max-width: 768px) {
						grid-template-columns: 1fr;
					}
				`}
			>
				{homeCards.map((card, index) => (
					<div
						key={index}
						css={css`
							cursor: pointer;
							transition: transform 0.3s ease, box-shadow 0.3s ease;

							&:hover {
								transform: translateY(-5px);
							}
						`}
						onClick={(e) => handleCardClick(card, index, e)}
					>
						<div
							css={css`
								background-color: ${defaultTheme.colors.white};
								border-radius: 8px;
								box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
								border: 1px solid ${defaultTheme.colors.grey_3};
								transition: box-shadow 0.3s ease;

								&:hover {
									box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
								}
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
									<div
										css={css`
											display: flex;
											justify-content: space-between;
											align-items: center;
											margin-bottom: 8px;
										`}
									>
										<h3
											css={css`
												font-size: 1.125rem;
												font-weight: 600;
												color: ${defaultTheme.colors.hero};
											`}
										>
											{card.title}
										</h3>
										{card.subItems && (
											<button
												onClick={(e) => {
													e.stopPropagation();
													setOpenDropdown(openDropdown === index ? null : index);
												}}
												css={css`
													background: none;
													border: none;
													cursor: pointer;
													transform: ${openDropdown === index ? 'rotate(180deg)' : 'rotate(0deg)'};
													transition: transform 0.3s ease;
												`}
											>
												▼
											</button>
										)}
									</div>
									<p
										css={css`
											font-size: 0.875rem;
											color: ${defaultTheme.colors.grey_6};
											margin-bottom: 16px;
										`}
									>
										{card.description}
									</p>
								</div>
							</div>
							{card.subItems && openDropdown === index && (
								<div
									css={css`
										border-top: 1px solid ${defaultTheme.colors.grey_3};
										padding: 16px;
									`}
								>
									{card.subItems.map((subItem, subIndex) => (
										<div
											key={subIndex}
											onClick={(e) => handleSubItemClick(subItem, e)}
											css={css`
												display: block;
												padding: 10px 0;
												color: ${defaultTheme.colors.grey_6};
												text-decoration: none;
												font-size: 0.875rem;
												transition: color 0.3s ease;
												cursor: pointer;

												&:hover {
													color: ${defaultTheme.colors.primary};
												}

												&:not(:last-child) {
													border-bottom: 1px solid ${defaultTheme.colors.grey_3};
												}
											`}
										>
											{subItem.title}
										</div>
									))}
								</div>
							)}
						</div>
					</div>
				))}
			</div>

			<div
				css={css`
					margin-top: 24px;
				`}
			>
				<HomeCommunityResources />
			</div>
			<div
				css={css`
					margin-top: 24px;
				`}
			>
				<HomeAcknowledgements />
			</div>
		</div>
	);
};

export default HomeNavigation;
