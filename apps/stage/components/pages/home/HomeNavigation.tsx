// components/pages/home/HomeNavigation.tsx
import { css, useTheme } from '@emotion/react';
import { ReactElement, useEffect, useState } from 'react';
import { INTERNAL_PATHS } from '../../../global/utils/constants';
import { DataTableInfo } from '../../../global/utils/dataTablesDiscovery';
import HomeAcknowledgements from './HomeAcknowledgements';

interface CardItem {
	title: string;
	link: string;
	description: string;
	subItems?: { title: string; link: string; external?: boolean }[];
	external?: boolean;
	isDynamic?: boolean;
}

interface SectionItem {
	title: string;
	id: string;
	order: number;
}

const HomeNavigation = (): ReactElement => {
	const theme = useTheme();
	const [openDropdown, setOpenDropdown] = useState<number | null>(null);
	const [docSections, setDocSections] = useState<SectionItem[]>([]);
	const [dataTables, setDataTables] = useState<DataTableInfo[]>([]);
	const [homeCards, setHomeCards] = useState<CardItem[]>([
		{
			title: 'Explore the Data',
			link: '#',
			description: 'Browse and interact with datasets',
			subItems: [], // Will be populated dynamically with data tables
		},
		{
			title: 'Documentation & Guides',
			link: INTERNAL_PATHS.DOCUMENTATION,
			description: 'Phased guides covering Prelude usage',
			isDynamic: true,
		},
		{
			title: 'Find Support',
			link: 'https://docs.overture.bio/community/support',
			description: 'Connect with our community and get help',
			external: true,
		},
		{
			title: 'Community Resources',
			link: '#',
			description: 'Additional Overture resources',
			subItems: [
				{ title: 'Overture Docs', link: 'https://docs.overture.bio/', external: true },
				{ title: 'Overture.bio', link: 'https://overture.bio/', external: true },
				{ title: 'Overture-Stack GitHub', link: 'https://github.com/overture-stack', external: true },
			],
		},
	]);

	// Load data tables from API
	useEffect(() => {
		fetch('/api/data-tables')
			.then((response) => response.json())
			.then((data) => {
				setDataTables(data);

				// Update the Explore the Data card with data tables
				setHomeCards((prevCards) =>
					prevCards.map((card) =>
						card.title === 'Explore the Data'
							? {
									...card,
									subItems: data.map((table: DataTableInfo) => ({
										title: table.title,
										link: table.path,
									})),
							  }
							: card,
					),
				);
			})
			.catch((error) => {
				console.error('Error fetching data tables:', error);
			});
	}, []);

	// Load documentation sections
	useEffect(() => {
		const fetchDocs = async () => {
			try {
				const response = await fetch('/api/docs');
				if (!response.ok) throw new Error('Failed to fetch documentation list');

				const files = await response.json();
				const sectionsPromises = files.map(async (filename: string) => {
					try {
						const contentResponse = await fetch(`/docs/${filename}`);
						if (!contentResponse.ok) throw new Error(`Failed to load ${filename}`);

						const content = await contentResponse.text();
						return {
							title: extractTitle(content),
							id: createSlug(filename),
							order: extractOrder(filename),
						};
					} catch (error) {
						console.error(`Error processing file ${filename}:`, error);
						return null;
					}
				});

				const sections = (await Promise.all(sectionsPromises))
					.filter((section): section is SectionItem => section !== null)
					.sort((a, b) => a.order - b.order);

				setDocSections(sections);
				setHomeCards((prevCards) =>
					prevCards.map((card) =>
						card.isDynamic
							? {
									...card,
									subItems: sections.map((section) => ({
										title: section.title,
										link: `${INTERNAL_PATHS.DOCUMENTATION}/${section.id}`,
									})),
							  }
							: card,
					),
				);
			} catch (error) {
				console.error('Error fetching documentation:', error);
			}
		};

		fetchDocs();
	}, []);

	const handleCardClick = (card: CardItem, index: number, e: React.MouseEvent) => {
		if (card.subItems && card.subItems.length > 0) {
			e.preventDefault();
			setOpenDropdown(openDropdown === index ? null : index);
		} else if (card.external) {
			window.open(card.link, '_blank', 'noopener,noreferrer');
		} else {
			e.preventDefault();
			window.location.href = card.link;
		}
	};

	const handleSubItemClick = (subItem: { title: string; link: string; external?: boolean }, e: React.MouseEvent) => {
		e.preventDefault();
		if (subItem.external) {
			window.open(subItem.link, '_blank', 'noopener,noreferrer');
		} else {
			window.location.href = subItem.link;
		}
	};

	// CSS styles
	const styles = {
		container: css`
			width: 95%;
			margin: 0 auto;
			padding: 24px 16px 48px;
			@media (max-width: 1280px) {
				width: 92%;
			}
		`,
		grid: css`
			display: grid;
			grid-template-columns: repeat(2, 1fr);
			gap: 20px;
			@media (max-width: 1024px) {
				grid-template-columns: 1fr 1fr;
			}
			@media (max-width: 768px) {
				grid-template-columns: 1fr;
			}
		`,
		card: css`
			cursor: pointer;
			transition: transform 0.25s ease, box-shadow 0.25s ease;
			&:hover {
				transform: translateY(-1px);
			}
		`,
		cardContainer: css`
			background-color: ${theme.colors.white};
			border-radius: 8px;
			box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
			border: 1px solid ${theme.colors.grey_3};
			transition: box-shadow 0.25s ease;
			&:hover {
				box-shadow: 0 2px 5px rgba(0, 0, 0, 0.15);
			}
		`,
		cardContent: css`
			padding: 18px;
		`,
		cardHeader: css`
			display: flex;
			justify-content: space-between;
			align-items: center;
		`,
		cardTitle: css`
			font-size: 1.125rem;
			font-weight: 600;
			color: ${theme.colors.primary};
			margin: 0 0 4px 0;
		`,
		cardDescription: css`
			font-size: 0.875rem;
			color: ${theme.colors.grey_6};
			margin: 4px 0;
		`,
		dropdownButton: css`
			background: none;
			border: none;
			cursor: pointer;
			transition: transform 0.2s ease;
			padding: 4px;
		`,
		dropdownContent: css`
			border-top: 1px solid ${theme.colors.grey_3};
			padding: 12px;
			max-height: 260px;
			overflow-y: auto;
		`,
		dropdownItem: css`
			display: block;
			padding: 8px 0;
			color: ${theme.colors.grey_6};
			text-decoration: none;
			font-size: 0.875rem;
			transition: color 0.2s ease;
			cursor: pointer;
			&:hover {
				color: ${theme.colors.secondary};
			}
			&:not(:last-child) {
				border-bottom: 1px solid ${theme.colors.grey_3};
			}
		`,
		acknowledgements: css`
			margin-top: 20px;
		`,
		emptySubItems: css`
			padding: 12px;
			color: ${theme.colors.grey_5};
			font-style: italic;
			text-align: center;
		`,
	};

	return (
		<div css={styles.container}>
			<div css={styles.grid}>
				{homeCards.map((card, index) => (
					<div key={index} css={styles.card} onClick={(e) => handleCardClick(card, index, e)}>
						<div css={styles.cardContainer}>
							<div css={styles.cardContent}>
								<div css={styles.cardHeader}>
									<h3 css={styles.cardTitle}>{card.title}</h3>
									{card.subItems && card.subItems.length > 0 && (
										<button
											onClick={(e) => {
												e.stopPropagation();
												setOpenDropdown(openDropdown === index ? null : index);
											}}
											css={css`
												${styles.dropdownButton}
												transform: ${openDropdown === index ? 'rotate(180deg)' : 'rotate(0deg)'};
											`}
											aria-label={openDropdown === index ? 'Hide options' : 'Show options'}
										>
											▼
										</button>
									)}
								</div>
								<p css={styles.cardDescription}>{card.description}</p>
							</div>
							{card.subItems && openDropdown === index && (
								<div css={styles.dropdownContent}>
									{card.subItems.length > 0 ? (
										card.subItems.map((subItem, subIndex) => (
											<div key={subIndex} onClick={(e) => handleSubItemClick(subItem, e)} css={styles.dropdownItem}>
												{subItem.title}
											</div>
										))
									) : (
										<div css={styles.emptySubItems}>No items available</div>
									)}
								</div>
							)}
						</div>
					</div>
				))}
			</div>

			<div css={styles.acknowledgements}>
				<HomeAcknowledgements />
			</div>
		</div>
	);
};

// Helper functions
function extractTitle(content: string): string {
	const titleMatch = content.match(/^#\s+(.+?)(?:\s+\{#.+\})?$/m);
	return titleMatch ? titleMatch[1].trim() : 'Untitled Section';
}

function createSlug(filename: string): string {
	return filename
		.replace(/^\d+[-_]?/, '')
		.replace(/\.md$/, '')
		.toLowerCase()
		.replace(/\s+/g, '-')
		.replace(/[^\w-]/g, '');
}

function extractOrder(filename: string): number {
	const match = filename.match(/^(\d+)/);
	return match ? parseInt(match[1], 10) : 999;
}

export default HomeNavigation;
