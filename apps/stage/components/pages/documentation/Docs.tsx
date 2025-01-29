/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';
import { marked } from 'marked';
import React, { useEffect, useState } from 'react';

interface Section {
	title: string;
	markdownPath: string;
	content?: string;
	order: number;
}

const theme = {
	colors: {
		background: '#ffffff',
		sidebar: '#f5f6f7',
		primary: '#0B75A2',
		text: '#2d3748',
		textSecondary: '#4a5568',
		border: '#e2e8f0',
		hover: 'rgba(0, 0, 0, 0.03)',
		codeBackground: '#f7fafc',
	},
	fonts: {
		base: 'system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, sans-serif',
		mono: 'SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
	},
	maxWidth: '85ch',
};

const styles = {
	container: css`
		width: 100%;
		background: ${theme.colors.background};
		min-height: 100vh;
	`,

	contentWrapper: css`
		display: flex;
		max-width: 1400px;
		margin: 0;
		gap: 0rem;

		@media (max-width: 768px) {
			flex-direction: column;
			gap: 1rem;
		}
	`,

	sidebar: css`
		width: 280px;
		background: ${theme.colors.sidebar};
		border-right: 1px solid ${theme.colors.border};
		position: sticky;
		top: 0;
		height: calc(100vh - 70px);
		overflow-y: auto;

		@media (max-width: 768px) {
			position: relative;
			width: 100%;
			height: auto;
			border-right: none;
			border-bottom: 1px solid ${theme.colors.border};
		}
	`,

	nav: css`
		ul {
			list-style: none;
			padding: 0 0.5rem;
			margin: 0;
		}

		li {
			margin: 0.5rem 0;
		}

		a {
			display: block;
			padding: 0.75rem 1rem;
			color: ${theme.colors.textSecondary};
			text-decoration: none;
			font-size: 0.875rem;
			border-radius: 0.375rem;
			transition: all 0.2s;

			&:hover,
			&.active {
				color: ${theme.colors.primary};
				background: ${theme.colors.hover};
			}
		}

		@media (max-width: 768px) {
			ul {
				display: flex;
				flex-wrap: wrap;
				gap: 0.75rem;
			}

			a {
				padding: 0.5rem 1rem;
				border: 1px solid ${theme.colors.border};
				border-radius: 2rem;
			}
		}
	`,

	main: css`
		flex: 1;
		padding: 3rem 4rem;
		overflow-x: hidden;

		@media (max-width: 768px) {
			padding: 2rem 1.5rem;
		}
	`,

	content: css`
		max-width: ${theme.maxWidth};
		margin: 0 auto;
		font-size: 1rem;
		line-height: 1.8;
		color: ${theme.colors.text};

		h1,
		h2,
		h3,
		h4 {
			font-weight: 600;
			line-height: 1.3;
			margin: 2.5rem 0 1.5rem;
		}

		h1 {
			font-size: 2.5rem;
			border-bottom: 2px solid ${theme.colors.border};
			padding-bottom: 1rem;
			margin-top: 0;
		}

		h2 {
			font-size: 2rem;
			border-bottom: 1px solid ${theme.colors.border};
			padding-bottom: 0.75rem;
		}

		h3 {
			font-size: 1.75rem;
		}

		h4 {
			font-size: 1.5rem;
		}

		p,
		ul,
		ol {
			margin: 1.5rem 0;
		}

		ul,
		ol {
			padding-left: 2rem;
		}

		a {
			color: ${theme.colors.primary};
			text-decoration: none;
			border-bottom: 1px solid transparent;
			transition: all 0.2s;

			&:hover {
				border-bottom-color: ${theme.colors.primary};
			}
		}

		blockquote {
			margin: 2.5rem 0;
			padding: 1.5rem 2rem;
			border-left: 4px solid ${theme.colors.primary};
			background: ${theme.colors.hover};
			border-radius: 0.5rem;

			p {
				margin: 0;
				font-style: italic;
			}
		}

		table {
			width: 100%;
			margin: 2.5rem 0;
			border-collapse: separate;
			border-spacing: 0;
			font-size: 0.9375rem;
			overflow-x: auto;
			border: 1px solid ${theme.colors.border};
			border-radius: 0.5rem;

			th,
			td {
				padding: 1rem 1.5rem;
				text-align: left;
			}

			th {
				background: ${theme.colors.sidebar};
				border-bottom: 2px solid ${theme.colors.border};
			}

			td {
				border-bottom: 1px solid ${theme.colors.border};
			}

			tr:last-child td {
				border-bottom: none;
			}
		}

		pre,
		code {
			font-family: ${theme.fonts.mono};
			background: ${theme.colors.codeBackground};
			border-radius: 0.5rem;
			font-size: 0.9375rem;
		}

		pre {
			padding: 1.5rem;
			overflow-x: auto;
			border: 1px solid ${theme.colors.border};
			margin: 2rem 0;

			code {
				background: none;
				padding: 0;
			}
		}

		code {
			padding: 0.2rem 0.4rem;
			border-radius: 0.25rem;
		}

		img {
			display: block;
			max-width: 100%;
			height: auto;
			margin: 2.5rem auto;

			@media (max-width: 768px) {
				margin: 1.5rem 0;
			}
		}
	`,
};

const Documentation: React.FC = () => {
	const [sections, setSections] = useState<Section[]>([]);
	const [activeHash, setActiveHash] = useState<string>('');
	const [isClient, setIsClient] = useState(false);

	// Function to extract title from markdown content
	const extractTitle = (content: string): string => {
		const titleMatch = content.match(/^#\s+(.+)$/m);
		return titleMatch ? titleMatch[1].trim() : 'Untitled Section';
	};

	// Function to extract order from filename
	const extractOrder = (filename: string): number => {
		const match = filename.match(/^(\d+)/);
		return match ? parseInt(match[1], 10) : 999;
	};

	useEffect(() => {
		const loadMarkdownFiles = async () => {
			try {
				// First, fetch the list of markdown files
				const response = await fetch('/api/docs');
				const files = await response.json();

				// Process each markdown file
				const sectionsPromises = files.map(async (filename: string) => {
					try {
						const response = await fetch(`/docs/${filename}`);
						const content = await response.text();

						return {
							title: extractTitle(content),
							markdownPath: `/docs/${filename}`,
							content,
							order: extractOrder(filename),
						};
					} catch (error) {
						console.error(`Error loading markdown for ${filename}:`, error);
						return null;
					}
				});

				const loadedSections = (await Promise.all(sectionsPromises))
					.filter((section): section is Section => section !== null)
					.sort((a, b) => a.order - b.order);

				setSections(loadedSections);
			} catch (error) {
				console.error('Error loading markdown files:', error);
			}
		};

		loadMarkdownFiles();
	}, []);

	useEffect(() => {
		setIsClient(true);
		setActiveHash(window.location.hash);

		const handleHashChange = () => {
			setActiveHash(window.location.hash);
		};

		window.addEventListener('hashchange', handleHashChange);
		return () => {
			window.removeEventListener('hashchange', handleHashChange);
		};
	}, []);

	return (
		<div css={styles.container}>
			<div css={styles.contentWrapper}>
				<aside css={styles.sidebar}>
					<nav css={styles.nav}>
						<ul>
							{sections.map((section, index) => {
								const sectionId = section.title.toLowerCase().replace(/\s+/g, '-');
								return (
									<li key={index}>
										<a href={`#${sectionId}`} className={isClient && activeHash === `#${sectionId}` ? 'active' : ''}>
											{section.title}
										</a>
									</li>
								);
							})}
						</ul>
					</nav>
				</aside>

				<main css={styles.main}>
					{sections.map((section, index) => (
						<article key={index} css={styles.content} id={section.title.toLowerCase().replace(/\s+/g, '-')}>
							<div dangerouslySetInnerHTML={{ __html: marked(section.content || '') }} />
						</article>
					))}
				</main>
			</div>
		</div>
	);
};

export default Documentation;
