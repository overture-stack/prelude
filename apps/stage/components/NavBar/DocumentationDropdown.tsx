// components/NavBar/DocumentationDropdown.tsx
import { css, useTheme } from '@emotion/react';
import cx from 'classnames';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { INTERNAL_PATHS } from '../../global/utils/constants';
import { InternalLink } from '../Link';
import { extractOrder, extractTitle, generateId } from '../pages/documentation/utils/documentUtils';
import Dropdown from './Dropdown';
import { StyledListLink } from './styles';

interface DocSection {
	title: string;
	id: string;
	order: number;
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
				const sectionsPromises = files.map(async (filename: string) => {
					try {
						const contentResponse = await fetch(`/docs/${filename}`);
						if (!contentResponse.ok) throw new Error(`Failed to load ${filename}`);

						const content = await contentResponse.text();
						const title = extractTitle(content);
						const dropdownId = generateId(title);
						console.log(`[DEBUG] Creating dropdown: filename="${filename}", title="${title}", id="${dropdownId}"`);

						return {
							title,
							id: dropdownId,
							order: extractOrder(filename),
						};
					} catch (error) {
						console.error(`Error processing file ${filename}:`, error);
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

	if (loading) {
		return null; // Or a loading indicator
	}

	// If no documentation sections, return null
	if (docSections.length === 0) {
		return null;
	}

	// Generate dropdown items with hash-based navigation
	const dropdownItems = docSections.map((section) => (
		<InternalLink key={section.id} path={`${INTERNAL_PATHS.DOCUMENTATION}/${section.id}`}>
			<StyledListLink
				className={cx({
					active:
						router.asPath.includes(`#${section.id}`) ||
						router.asPath === `${INTERNAL_PATHS.DOCUMENTATION}/${section.id}`,
				})}
			>
				{section.title}
			</StyledListLink>
		</InternalLink>
	));

	// Generate paths for active state tracking (include both hash and legacy paths)
	const docPaths = [
		INTERNAL_PATHS.DOCUMENTATION,
		...docSections.map((section) => `${INTERNAL_PATHS.DOCUMENTATION}#${section.id}` as INTERNAL_PATHS),
		...docSections.map((section) => `${INTERNAL_PATHS.DOCUMENTATION}/${section.id}` as INTERNAL_PATHS),
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
