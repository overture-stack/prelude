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
		text: '#1c1e21',
		textSecondary: '#606770',
		border: '#dadde1',
		white: '#ffffff',
		hover: 'rgba(0, 0, 0, 0.05)',
	},
	fonts: {
		base: 'system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, sans-serif',
		mono: 'SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
	},
	maxWidth: '65ch',
};

const styles = {
	container: css`
		width: 100%;
		background: ${theme.colors.background};
		min-height: 100vh;
		margin: 0; // Ensure no default margins
		padding: 0; // Ensure no default padding
	`,

	contentWrapper: css`
		display: flex;
		max-width: 1200px;
		margin: 0;
		padding: 0;
		gap: 0rem;

		@media (max-width: 768px) {
			flex-direction: column;
			gap: 0;
		}
	`,

	sidebar: css`
		width: 250px;
		background: ${theme.colors.sidebar};
		border-right: 1px solid ${theme.colors.border};
		position: sticky;
		top: 0;
		height: calc(100vh - 70px);
		overflow-y: auto;
		z-index: 1;

		@media (max-width: 768px) {
			position: relative;
			width: 100%;
			height: auto;
			border-right: none;
			border-bottom: 1px solid ${theme.colors.border};
			padding: 0;

			.sidebar-title {
				padding: 1rem;
			}
		}
	`,

	nav: css`
		padding: 2rem 0;

		ul {
			list-style: none;
			padding: 0 0rem;
			margin: 0;
		}

		li {
			margin: 0.25 rem 0;
		}

		a {
			display: block;
			padding: 0.5rem 1rem;
			color: ${theme.colors.textSecondary};
			text-decoration: none;
			font-size: 0.75rem;
			line-height: 1.4;
			border-right: 2px solid transparent;
			transition: all 0.2s;

			&:hover {
				color: ${theme.colors.primary};
				background: ${theme.colors.hover};
			}

			&.active {
				color: ${theme.colors.primary};
				border-right-color: ${theme.colors.primary};
				background: ${theme.colors.hover};
				font-weight: 500;
			}
		}

		@media (max-width: 768px) {
			padding: 0.5rem;

			ul {
				display: flex;
				flex-wrap: wrap;
				gap: 0.5rem;
				padding: 0;
			}

			li {
				margin: 0;
				width: auto;
			}

			a {
				padding: 0.5rem 1rem;
				border: 1px solid ${theme.colors.border};
				border-radius: 2rem;
				white-space: nowrap;
				border-left-width: 1px;

				&.active {
					border-color: ${theme.colors.primary};
					background: ${theme.colors.hover};
				}
			}
		}
	`,

	main: css`
		flex: 1;
		padding: 3rem;
		max-width: 100%;
		overflow-x: hidden;

		@media (max-width: 768px) {
			padding: 1.5rem 1rem;
		}
	`,

	content: css`
		max-width: 100%;
		margin: 0 auto;
		font-size: 1.025rem;
		line-height: 1.75;
		color: ${theme.colors.text};
		padding: 0 1rem;

		h1 {
			font-size: 2.75rem;
			font-weight: 700;
			line-height: 1.2;
			margin: 0 0 2rem;
			letter-spacing: -0.025em;
			border-bottom: 1px solid ${theme.colors.border};
			padding-bottom: 0.5rem;
			color: ${theme.colors.text};
		}

		h2 {
			font-size: 2.2rem;
			font-weight: 600;
			margin: 3rem 0 1.5rem;
			line-height: 1.3;
			letter-spacing: -0.025em;
			border-bottom: 1px solid ${theme.colors.border};
			padding-bottom: 0.5rem;
		}

		h3 {
			font-size: 2rem;
			font-weight: 600;
			margin: 2rem 0 1rem;
			line-height: 1.4;
		}

		h4 {
			font-size: 1.5rem;
			font-weight: 600;
			margin: 2rem 0 1rem;
			line-height: 1.4;
		}

		h5 {
			font-size: 1.2rem;
			font-weight: 600;
			margin: 2rem 0 1rem;
			line-height: 1.4;
		}

		h6 {
			font-size: 1rem;
			font-weight: 600;
			margin: 2rem 0 1rem;
			line-height: 1.4;
		}

		p {
			margin: 1.25rem 0;
			font-size: 0.9rem;
		}

		ul,
		ol {
			margin: 0;
			padding-left: 1.5rem;
			font-size: 0.9rem;
		}

		li {
			margin: 0;
			font-size: 0.9rem;
		}

		a {
			color: ${theme.colors.primary};
			text-decoration: none;
			border-bottom: 1px solid transparent;
			transition: border-color 0.2s;

			&:hover {
				border-bottom-color: ${theme.colors.primary};
			}
		}

		blockquote {
			margin: 2rem 0;
			padding: 1rem 1.5rem;
			border-left: 4px solid ${theme.colors.primary};
			background: ${theme.colors.hover};
			border-radius: 0.25rem;

			p {
				margin: 0;
			}
		}

		table {
			width: 100%;
			border-collapse: collapse;
			margin: 2rem 0;
			font-size: 0.85rem;
			display: block;
			overflow-x: auto;
			-webkit-overflow-scrolling: touch;

			th {
				background: ${theme.colors.sidebar};
				font-weight: 600;
				text-align: left;
				padding: 0.75rem 1rem;
				border-bottom: 2px solid ${theme.colors.border};
			}

			td {
				padding: 0.75rem 1rem;
				border-bottom: 1px solid ${theme.colors.border};
				vertical-align: top;
			}

			tr:nth-child(even) {
				background: ${theme.colors.hover};
			}
		}

		pre {
			padding: 1.25rem;
			background: ${theme.colors.sidebar};
			border-radius: 5px;
			white-space: pre-wrap;
			word-wrap: break-word;
			word-break: break-all;
			border: 2px solid ${theme.colors.border};
			max-width: 100%;
			box-sizing: border-box;

			code {
				background: none;
				padding: 0;
				font-size: 0.85rem;
				color: ${theme.colors.text};
			}
		}

		code {
			background: ${theme.colors.sidebar};
			padding: 0.2rem 0.4rem;
			border-radius: 0.25rem;
			font-size: 0.85rem;
			font-family: ${theme.fonts.mono};
			color: ${theme.colors.text};
			white-space: pre-wrap;
			word-wrap: break-word;
			word-break: break-all;
		}

		img {
			display: block;
			width: 100%;
			height: auto;
			margin: 2rem auto;
			border-radius: 0.5rem;
			border: 1px solid ${theme.colors.border};
			object-fit: contain; // Ensures image maintains aspect ratio
			max-height: 600px; // Prevents images from being too tall

			@media (max-width: 768px) {
				margin: 1rem 0;
				border-radius: 0.25rem;
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
