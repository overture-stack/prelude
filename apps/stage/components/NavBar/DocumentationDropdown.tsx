// components/NavBar/DocumentationDropdown.tsx
import { css, useTheme } from '@emotion/react';
import cx from 'classnames';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { INTERNAL_PATHS } from '../../global/utils/constants';
import { InternalLink } from '../Link';
import Dropdown from './Dropdown';
import { StyledListLink } from './styles';

const CATEGORY_LABELS: Record<string, string> = {
	user: 'User Guides',
	developer: 'Developer Guides',
	admin: 'Admin Guides',
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
			.then((sections: DocSection[]) => {
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

	const categories = Array.from(grouped.keys());

	// Build dropdown items with category headers
	const dropdownItems = Array.from(grouped.entries()).flatMap(([category, sections]) => [
		// Category header — not a link, just a label
		<div
			key={`header-${category}`}
			data-no-hover
			css={css`
				padding: ${categories.indexOf(category) === 0 ? '12px 16px 6px' : '10px 16px 6px'};
				font-size: 10px;
				font-weight: 700;
				text-transform: uppercase;
				letter-spacing: 0.12em;
				color: ${theme.colors.accent_dark};
				cursor: default;
			`}
			onClick={(e) => e.stopPropagation()}
		>
			{CATEGORY_LABELS[category] ?? category}
		</div>,
		// Section links
		...sections.map((section, i) => (
			<InternalLink
				key={`${category}/${section.id}`}
				path={`${INTERNAL_PATHS.DOCUMENTATION}/${category}/${section.id}` as INTERNAL_PATHS}
			>
				<StyledListLink
					className={cx({
						active: router.asPath === `${INTERNAL_PATHS.DOCUMENTATION}/${category}/${section.id}`,
					})}
					css={css`
						${i === sections.length - 1 && category === categories[categories.length - 1]
							? 'padding-bottom: 14px;'
							: ''}
					`}
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
