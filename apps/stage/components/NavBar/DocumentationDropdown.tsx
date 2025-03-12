// components/NavBar/DocumentationDropdown.tsx
import cx from 'classnames';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { INTERNAL_PATHS } from '../../global/utils/constants';
import { InternalLink } from '../Link';
import Dropdown from './Dropdown';
import { linkStyles, StyledListLink } from './styles';

interface DocSection {
	title: string;
	id: string;
	order: number;
}

const DocumentationDropdown = () => {
	const router = useRouter();
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

	// Generate dropdown items
	const dropdownItems = docSections.map((section) => (
		<InternalLink key={section.id} path={`${INTERNAL_PATHS.DOCUMENTATION}/${section.id}`}>
			<StyledListLink
				className={cx({
					active: router.asPath === `${INTERNAL_PATHS.DOCUMENTATION}/${section.id}`,
				})}
			>
				{section.title}
			</StyledListLink>
		</InternalLink>
	));

	// Generate paths for active state tracking
	const docPaths = docSections.map((section) => `${INTERNAL_PATHS.DOCUMENTATION}/${section.id}` as INTERNAL_PATHS);

	return <Dropdown css={linkStyles} data={dropdownItems} label="Documentation" urls={docPaths} />;
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

export default DocumentationDropdown;
