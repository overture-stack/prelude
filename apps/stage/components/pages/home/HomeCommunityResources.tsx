import { css } from '@emotion/react';
import { ReactElement, useState } from 'react';
import defaultTheme from '../../theme';

interface ResourceItem {
	title: string;
	link: string;
	external?: boolean;
}

const communityResources: ResourceItem[] = [
	{
		title: 'Overture Docs',
		link: 'https://docs.overture.bio/',
		external: true,
	},
	{
		title: 'Overture.bio',
		link: 'https://overture.bio/',
		external: true,
	},
	{
		title: 'Overture-Stack GitHub',
		link: 'https://github.com/overture-stack',
		external: true,
	},
];

const HomeCommunityResources = (): ReactElement => {
	const [isDropdownOpen, setIsDropdownOpen] = useState(false);

	const handleLinkClick = (link: string, external?: boolean) => {
		if (external) {
			window.open(link, '_blank', 'noopener,noreferrer');
		} else {
			window.location.href = link;
		}
	};

	return (
		<div
			css={css`
				cursor: pointer;
				transition: transform 0.3s ease, box-shadow 0.3s ease;

				&:hover {
					transform: translateY(-5px);
				}
			`}
			onClick={() => setIsDropdownOpen(!isDropdownOpen)}
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
									color: ${defaultTheme.colors.primary};
								`}
							>
								Community Resources
							</h3>
							<button
								onClick={(e) => {
									e.stopPropagation();
									setIsDropdownOpen(!isDropdownOpen);
								}}
								css={css`
									background: none;
									border: none;
									cursor: pointer;
									transform: ${isDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)'};
									transition: transform 0.3s ease;
								`}
							>
								▼
							</button>
						</div>
						<p
							css={css`
								font-size: 0.875rem;
								color: ${defaultTheme.colors.grey_6};
								margin-bottom: 16px;
							`}
						>
							Additional Overture resources
						</p>
					</div>
				</div>
				{isDropdownOpen && (
					<div
						css={css`
							border-top: 1px solid ${defaultTheme.colors.grey_3};
							padding: 16px;
						`}
					>
						{communityResources.map((resource, index) => (
							<div
								key={index}
								onClick={(e) => {
									e.stopPropagation();
									handleLinkClick(resource.link, resource.external);
								}}
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
								{resource.title}
							</div>
						))}
					</div>
				)}
			</div>
		</div>
	);
};

export default HomeCommunityResources;
