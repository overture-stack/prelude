// components/NavBar/DocumentationDropdown.tsx
import { css, useTheme } from '@emotion/react';
import cx from 'classnames';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { INTERNAL_PATHS } from '../../global/utils/constants';
import { InternalLink } from '../Link';
import { extractOrder, extractTitle, generateSlug } from '../pages/documentation/utils/documentUtils';
import Dropdown from './Dropdown';
import { StyledListLink } from './styles';

const CATEGORY_LABELS: Record<string, string> = {
	user: 'User Guides',
	developer: 'Developer Guides',
};

interface DocSection {
	title: string;
	id: string;
	order: number;
	category: string;
}

const DocumentationDropdown = () => {
	const router = useRouter();
	const theme = useTheme();
	const [docSections, setDocSections] = useState<DocSection[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		fetch('/api/docs')
			.then((response) => response.json())
			.then(async (files) => {
				// API returns paths like "user/00-Introduction.md"
				const sectionsPromises = files.map(async (filepath: string) => {
					try {
						const contentResponse = await fetch(`/docs/${filepath}`);
						if (!contentResponse.ok) throw new Error(`Failed to load ${filepath}`);

						const content = await contentResponse.text();
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
					.filter((section): section is DocSection => section !== null)
					.sort((a, b) => a.order - b.order);

				setDocSections(sections);
				setLoading(false);
			})
			.catch((error) => {
				console.error('Error fetching documentation:', error);
				setLoading(false);
			});
	}, []);

	if (loading || docSections.length === 0) {
		return null;
	}

	// Group sections by category, preserving order
	const grouped = new Map<string, DocSection[]>();
	for (const section of docSections) {
		const cat = section.category || 'general';
		if (!grouped.has(cat)) grouped.set(cat, []);
		grouped.get(cat)!.push(section);
	}

	// Build dropdown items with category headers
	const dropdownItems = Array.from(grouped.entries()).flatMap(([category, sections]) => [
		// Category header — not a link, just a label
		<div
			key={`header-${category}`}
			data-no-hover
			css={css`
				padding: 6px 12px 4px;
				font-size: 10px;
				font-weight: 700;
				text-transform: uppercase;
				letter-spacing: 0.1em;
				color: ${theme.colors.primary_dark};
				background: ${theme.colors.grey_2};
				cursor: default;
			`}
			onClick={(e) => e.stopPropagation()}
		>
			{CATEGORY_LABELS[category] ?? category}
		</div>,
		// Section links
		...sections.map((section) => (
			<InternalLink key={`${category}/${section.id}`} path={`${INTERNAL_PATHS.DOCUMENTATION}/${category}/${section.id}` as INTERNAL_PATHS}>
				<StyledListLink
					className={cx({
						active: router.asPath === `${INTERNAL_PATHS.DOCUMENTATION}/${category}/${section.id}`,
					})}
				>
					{section.title}
				</StyledListLink>
			</InternalLink>
		)),
	]);

	const docPaths = [
		INTERNAL_PATHS.DOCUMENTATION,
		...docSections.map((s) => `${INTERNAL_PATHS.DOCUMENTATION}/${s.category}/${s.id}` as INTERNAL_PATHS),
	];

	return (
		<Dropdown
			css={css`
				width: 100%;
				height: 100%;
				display: flex;
				align-items: center;
				justify-content: center;
				color: ${theme.colors.accent_dark};
				font-size: 14px;
				font-weight: bold;
			`}
			data={dropdownItems}
			label="Documentation"
			urls={docPaths}
		/>
	);
};

export default DocumentationDropdown;
