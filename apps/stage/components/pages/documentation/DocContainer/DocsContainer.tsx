// components/documentation/DocsContainer.tsx
import { css } from '@emotion/react';
import { useEffect, useState } from 'react';
import Sidebar from './Sidebar';
import theme from './theme';

interface Section {
	title: string;
	id: string;
	order: number;
}

const DocsContainer: React.FC = () => {
	const [sections, setSections] = useState<Section[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const fetchSections = async () => {
			try {
				const response = await fetch('/api/docs');

				if (!response.ok) {
					throw new Error('Failed to fetch documentation list');
				}

				const files: string[] = await response.json();

				// Process files to create sections
				const processedSections = files
					.map((filename) => ({
						title: extractTitle(filename),
						id: generateSlug(filename),
						order: extractOrder(filename),
					}))
					.sort((a, b) => a.order - b.order);

				setSections(processedSections);
				setLoading(false);
			} catch (err) {
				console.error('Error fetching documentation:', err);
				setError(err instanceof Error ? err.message : 'An unknown error occurred');
				setLoading(false);
			}
		};

		fetchSections();
	}, []);

	const styles = {
		container: css`
			display: flex;
			width: 100%;
			min-height: 100vh;
		`,
		main: css`
			flex: 1;
			padding: 2rem;
			background: ${theme.colors.background};
		`,
		loadingError: css`
			display: flex;
			justify-content: center;
			align-items: center;
			height: 100vh;
			font-size: 1.2rem;
			color: ${theme.colors.textSecondary};
		`,
	};

	if (loading) {
		return <div css={styles.loadingError}>Loading documentation...</div>;
	}

	if (error) {
		return <div css={styles.loadingError}>Error: {error}</div>;
	}

	return (
		<div css={styles.container}>
			<Sidebar sections={sections} />
			<main css={styles.main}>
				<h1>Select a section from the sidebar</h1>
			</main>
		</div>
	);
};

// Utility functions
function generateSlug(filename: string): string {
	return filename
		.replace(/^\d+[-_]?/, '') // Remove leading number and optional separator
		.replace(/\.md$/, '') // Remove .md extension
		.toLowerCase()
		.replace(/\s+/g, '-') // Replace spaces with hyphens
		.replace(/[^\w-]/g, ''); // Remove non-word characters
}

function extractTitle(filename: string): string {
	// Remove file extension and leading number
	return filename
		.replace(/^\d+[-_]?/, '') // Remove leading number and optional separator
		.replace(/\.md$/, '') // Remove .md extension
		.replace(/-/g, ' ') // Replace hyphens with spaces
		.split(' ')
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(' ');
}

function extractOrder(filename: string): number {
	const match = filename.match(/^(\d+)/);
	return match ? parseInt(match[1], 10) : 999;
}

export default DocsContainer;
