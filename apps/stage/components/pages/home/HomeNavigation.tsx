// components/pages/home/HomeNavigation.tsx
import { css, useTheme } from '@emotion/react';
import { ReactElement, useEffect, useState } from 'react';
import { INTERNAL_PATHS } from '../../../global/utils/constants';
import { DataTableInfo } from '../../../global/utils/dataTablesDiscovery';
import { extractOrder, extractTitle, generateSlug } from '../documentation/utils/documentUtils';
import HomeAcknowledgements from './HomeAcknowledgements';

const CATEGORY_LABELS: Record<string, string> = {
	user: 'User Guides',
	developer: 'Developer Guides',
	admin: 'Admin Guides',
};

interface SubItem {
	title: string;
	link: string;
	external?: boolean;
	isHeader?: boolean;
}

interface CardItem {
	title: string;
	link: string;
	description: string;
	subItems?: SubItem[];
	external?: boolean;
	isDynamic?: boolean;
}

interface SectionItem {
	title: string;
	id: string;
	order: number;
	category: string;
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
			description: 'Browse and interact with the data',
			isDynamic: true,
		},
		{
			title: 'Conversational Data Discovey Setup',
			link: `${INTERNAL_PATHS.DOCUMENTATION}/user/setup`,
			description: 'Connect LM Studio and run your first query',
		},
		{
			title: 'Project Documentation',
			link: INTERNAL_PATHS.DOCUMENTATION,
			description: 'User, admin and developer documentation',
			isDynamic: true,
		},
		{
			title: 'Resources',
			link: '#',
			description: 'Overture docs, source code, and community',
			subItems: [
				{ title: 'MCP Server Source code', link: 'https://github.com/overture-stack', external: true },
				{
					title: 'Search API (Arranger) Documentation',
					link: 'https://docs.overture.bio/docs/core-software/Arranger/overview',
					external: true,
				},
				{ title: 'Overture.bio', link: 'https://overture.bio/', external: true },
				{ title: 'Community Support', link: 'https://docs.overture.bio/community/support', external: true },
			],
		},
	]);

	// Load data tables and documentation sections
	useEffect(() => {
		const fetchData = async () => {
			try {
				// Fetch data tables
				const dataTablesResponse = await fetch('/api/data-tables');
				if (dataTablesResponse.ok) {
					const tables = await dataTablesResponse.json();
					setDataTables(tables);
				}

				// Fetch documentation — API returns paths like "user/00-Introduction.md"
				const docsResponse = await fetch('/api/docs');
				if (!docsResponse.ok) throw new Error('Failed to fetch documentation list');

				const files = await docsResponse.json();
				const sectionsPromises = files.map(async (filepath: string) => {
					try {
						const contentResponse = await fetch(`/docs/${filepath}`);
						if (!contentResponse.ok) throw new Error(`Failed to load ${filepath}`);

						const content = await contentResponse.text();
						// filepath is "category/NN-Title.md" — parse category and filename separately
						const slashIdx = filepath.indexOf('/');
						const category = slashIdx !== -1 ? filepath.slice(0, slashIdx) : '';
						const filename = slashIdx !== -1 ? filepath.slice(slashIdx + 1) : filepath;
						return {
							title: extractTitle(content) || generateSlug(filename),
							id: generateSlug(filename),
							order: extractOrder(filename),
							category,
						};
					} catch (error) {
						console.error(`Error processing file ${filepath}:`, error);
						return null;
					}
				});

				const sections = (await Promise.all(sectionsPromises))
					.filter((section): section is SectionItem => section !== null)
					.sort((a, b) => a.order - b.order);

				setDocSections(sections);
			} catch (error) {
				console.error('Error fetching data:', error);
			}
		};

		fetchData();
	}, []);

	// Update cards when data tables or doc sections change
	useEffect(() => {
		setHomeCards((prevCards) =>
			prevCards.map((card) => {
				if (card.title === 'Explore the Data' && card.isDynamic) {
					// If only one data table, link directly to it (no dropdown)
					if (dataTables.length === 1) {
						return {
							...card,
							link: dataTables[0].path,
							subItems: undefined,
						};
					}
					// If multiple data tables, show as dropdown
					return {
						...card,
						subItems: dataTables.map((table) => ({
							title: table.title,
							link: table.path,
						})),
					};
				}
				if (card.title === 'Project Documentation' && card.isDynamic) {
					// Group by category and insert header items
					const grouped = new Map<string, SectionItem[]>();
					for (const section of docSections) {
						const cat = section.category || 'general';
						if (!grouped.has(cat)) grouped.set(cat, []);
						grouped.get(cat)!.push(section);
					}
					const subItems: SubItem[] = Array.from(grouped.entries()).flatMap(([category, sections]) => [
						{ title: CATEGORY_LABELS[category] ?? category, link: '', isHeader: true },
						...sections.map((section) => ({
							title: section.title,
							link: `${INTERNAL_PATHS.DOCUMENTATION}/${section.category}/${section.id}`,
						})),
					]);
					return { ...card, subItems };
				}
				return card;
			}),
		);
	}, [dataTables, docSections]);

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

	const handleSubItemClick = (subItem: SubItem, e: React.MouseEvent) => {
		e.preventDefault();
		if (subItem.isHeader || !subItem.link) return;
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
			transition:
				transform 0.25s ease,
				box-shadow 0.25s ease;
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
		dropdownHeader: css`
			padding: 6px 8px 4px;
			font-size: 0.65rem;
			font-weight: 700;
			text-transform: uppercase;
			letter-spacing: 0.1em;
			color: ${theme.colors.primary};
			background: ${theme.colors.grey_2};
			cursor: default;
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
										card.subItems.map((subItem, subIndex) =>
											subItem.isHeader ? (
												<div key={subIndex} css={styles.dropdownHeader}>
													{subItem.title}
												</div>
											) : (
												<div key={subIndex} onClick={(e) => handleSubItemClick(subItem, e)} css={styles.dropdownItem}>
													{subItem.title}
												</div>
											),
										)
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

export default HomeNavigation;
