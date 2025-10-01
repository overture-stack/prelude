import { css } from '@emotion/react';
import Link from 'next/link';
import { ReactElement, useEffect, useRef } from 'react';
import { DocumentationData } from '../../../lib/documentation';
import FundingStatement from './FundingStatement';
import theme from './shared/theme';

interface DocumentationPageProps extends DocumentationData {}

// Utility function to copy text to clipboard
const copyToClipboard = async (text: string): Promise<boolean> => {
	try {
		if (navigator.clipboard && window.isSecureContext) {
			await navigator.clipboard.writeText(text);
			return true;
		} else {
			// Fallback for older browsers or non-secure contexts
			const textArea = document.createElement('textarea');
			textArea.value = text;
			textArea.style.position = 'fixed';
			textArea.style.opacity = '0';
			document.body.appendChild(textArea);
			textArea.focus();
			textArea.select();
			const success = document.execCommand('copy');
			document.body.removeChild(textArea);
			return success;
		}
	} catch (error) {
		console.error('Failed to copy to clipboard:', error);
		return false;
	}
};

const DocumentationPage = ({ sections, currentSection, headings }: DocumentationPageProps): ReactElement => {
	const contentRef = useRef<HTMLDivElement>(null);

	// Add heading anchor links after content renders
	useEffect(() => {
		if (!contentRef.current || !currentSection) return;

		const headingElements = contentRef.current.querySelectorAll('h1, h2, h3, h4, h5, h6');
		const clickHandlers: Array<() => void> = [];

		headingElements.forEach((heading) => {
			// Skip if already has a link
			if (heading.querySelector('.heading-link')) return;

			const id = heading.getAttribute('id');
			if (!id) return;

			// Create the # link element
			const linkElement = document.createElement('a');
			linkElement.className = 'heading-link';
			linkElement.textContent = '#';
			linkElement.setAttribute('aria-label', `Copy link to ${heading.textContent}`);

			// Create click handler for entire heading
			const handleClick = async (e: Event) => {
				e.preventDefault();
				const fullUrl = `${window.location.origin}${window.location.pathname}#${id}`;
				const success = await copyToClipboard(fullUrl);

				if (success) {
					// Update URL without scrolling
					window.history.pushState(null, '', `#${id}`);

					// Visual feedback
					linkElement.textContent = '✓';
					setTimeout(() => {
						linkElement.textContent = '#';
					}, 1000);
				} else {
					// Fallback: just update URL
					window.location.hash = id;
				}
			};

			// Make the entire heading clickable
			heading.style.cursor = 'pointer';
			heading.addEventListener('click', handleClick);
			clickHandlers.push(() => heading.removeEventListener('click', handleClick));

			// Append the link to the heading
			heading.appendChild(linkElement);
		});

		// Cleanup function
		return () => {
			clickHandlers.forEach(cleanup => cleanup());
		};
	}, [currentSection]);

	return (
		<div css={containerStyle}>
			<aside css={sidebarStyle}>
				<nav css={navStyle}>
					<h3 css={sidebarTitleStyle}>Documentation</h3>
					<ul css={navListStyle}>
						{sections.map((section) => (
							<li key={section.id} css={navItemStyle}>
								<Link href={`/documentation/${section.id}`}>
									<a css={navLinkStyle} className={currentSection?.id === section.id ? 'active' : ''}>
										{section.title}
									</a>
								</Link>
							</li>
						))}
					</ul>
				</nav>
				<FundingStatement />
			</aside>

			<main css={mainContentStyle}>
				{currentSection ? (
					<>
						<div css={contentContainerStyle}>
							<article css={articleStyle}>
								<div ref={contentRef} css={markdownContentStyle} dangerouslySetInnerHTML={{ __html: currentSection.htmlContent }} />
							</article>
						</div>
						{headings.length > 0 && (
							<aside css={tocStyle}>
								<nav css={tocNavStyle}>
									<ul css={tocListStyle}>
										{headings.map((heading) => (
											<li key={heading.id} css={tocItemStyle} data-level={heading.level}>
												<a href={`#${heading.id}`} css={tocLinkStyle}>
													{heading.text}
												</a>
											</li>
										))}
									</ul>
								</nav>
							</aside>
						)}
					</>
				) : (
					<div css={noContentStyle}>
						<h2>No Content Available</h2>
						<p>The requested documentation section could not be found.</p>
					</div>
				)}
			</main>
		</div>
	);
};

const containerStyle = css`
	display: flex;
	min-height: 100vh;
	background-color: ${theme.colors.background};
	padding-bottom: 47px;
	width: 100%;
	max-width: 100vw;
	box-sizing: border-box;
	scroll-behavior: smooth;
`;

const sidebarStyle = css`
	width: ${theme.sidebarWidth};
	background: ${theme.colors.sidebar};
	border-right: 1px solid ${theme.colors.sidebarBorder};
	position: fixed;
	height: calc(100vh - 97px);
	overflow-y: auto;
	top: 50px;
	left: 0;
	z-index: ${theme.zIndices.sidebar};
	display: flex;
	flex-direction: column;

	@media (max-width: ${theme.breakpoints.lg}) {
		display: none;
	}
`;

const navStyle = css`
	padding: ${theme.spacing[6]} ${theme.spacing[4]};
	flex: 1;
`;

const sidebarTitleStyle = css`
	font-size: ${theme.fontSize.lg};
	font-weight: 600;
	color: ${theme.colors.text};
	margin: 0 0 ${theme.spacing[4]} 0;
	padding-bottom: ${theme.spacing[3]};
	border-bottom: 1px solid ${theme.colors.sidebarBorder};
`;

const navListStyle = css`
	list-style: none;
	margin: 0;
	padding: 0;
`;

const navItemStyle = css`
	margin: ${theme.spacing[1]} 0;
`;

const navLinkStyle = css`
	display: block;
	padding: ${theme.spacing[2]} ${theme.spacing[3]};
	color: ${theme.colors.textSecondary};
	text-decoration: none;
	font-size: ${theme.fontSize.sm};
	font-weight: 400;
	line-height: ${theme.lineHeight.base};
	transition: ${theme.transitions.fast};
	border-left: 3px solid transparent;

	&:hover {
		background: ${theme.colors.sidebarItemBackgroundHover};
		color: ${theme.colors.text};
		text-decoration: none;
	}

	&.active {
		background: ${theme.colors.sidebarItemBackgroundActive};
		color: ${theme.colors.primary};
		font-weight: 600;
		border-left-color: ${theme.colors.primary};
	}

	&:focus {
		outline: 2px solid ${theme.colors.primary};
		outline-offset: -2px;
	}
`;

const mainContentStyle = css`
	flex: 1;
	margin-left: ${theme.sidebarWidth};
	min-width: 0;
	overflow-x: hidden;
	overflow-y: visible;
	width: 100%;
	position: relative;

	@media (max-width: ${theme.breakpoints.lg}) {
		margin-left: 0;
	}

	@media (max-width: ${theme.breakpoints.md}) {
		padding: 0;
	}
`;

const contentContainerStyle = css`
	margin: 0;
	padding: 0 ${theme.spacing[6]};
	width: 100%;
	box-sizing: border-box;

	@media (min-width: 1160px) {
		max-width: calc(100% - 280px);
		padding-right: ${theme.spacing[8]};
	}

	@media (min-width: 993px) and (max-width: 1159px) {
		max-width: 100%;
		padding: 0 ${theme.spacing[6]};
	}

	@media (max-width: 992px) {
		padding: 0 ${theme.spacing[6]};
		max-width: 100%;
	}

	@media (max-width: ${theme.breakpoints.md}) {
		padding: 0 ${theme.spacing[5]};
		max-width: 100vw;
	}

	@media (max-width: ${theme.breakpoints.sm}) {
		padding: 0 ${theme.spacing[4]};
		max-width: 100vw;
	}
`;

const articleStyle = css`
	flex: 1;
	min-width: 0;
	padding: ${theme.spacing[8]} 0;
	overflow-x: hidden;
	box-sizing: border-box;
	min-height: 100vh;

	@media (max-width: ${theme.breakpoints.md}) {
		padding: ${theme.spacing[6]} 0;
	}

	@media (max-width: ${theme.breakpoints.sm}) {
		padding: ${theme.spacing[4]} 0;
	}
`;

const markdownContentStyle = css`
	font-family: ${theme.fonts.base};
	line-height: 1.6;
	color: ${theme.colors.text};
	word-wrap: break-word;
	overflow-wrap: break-word;
	hyphens: auto;
	font-size: ${theme.fontSize.base};
	box-sizing: border-box;

	@media (max-width: ${theme.breakpoints.md}) {
		font-size: ${theme.fontSize.sm};
		line-height: 1.5;
	}

	@media (max-width: ${theme.breakpoints.sm}) {
		font-size: ${theme.fontSize.xs};
		line-height: 1.5;
		word-break: break-word;
	}

	h1,
	h2,
	h3,
	h4,
	h5,
	h6 {
		font-family: ${theme.fonts.heading};
		font-weight: 600;
		line-height: 1.25;
		margin-top: ${theme.spacing[12]};
		margin-bottom: ${theme.spacing[6]};
		color: ${theme.colors.text};
		scroll-margin-top: 100px;
		position: relative;

		&:first-child {
			margin-top: 0;
		}

		&:hover .heading-link {
			opacity: 1;
		}

		.heading-link {
			opacity: 0;
			transition: opacity 0.2s ease;
			color: ${theme.colors.primary};
			text-decoration: none;
			font-size: 0.8em;
			font-weight: normal;
			cursor: pointer;
			padding: 4px;
			border-radius: 4px;
			margin-left: 8px;
			display: inline;

			&:hover {
				background: ${theme.colors.primaryLight};
			}

			@media (max-width: ${theme.breakpoints.md}) {
				font-size: 0.7em;
			}

			@media (max-width: ${theme.breakpoints.sm}) {
				opacity: 1;
			}
		}

		+ p,
		+ ul,
		+ ol,
		+ blockquote,
		+ pre,
		+ .table-container {
			margin-top: ${theme.spacing[4]};

			@media (max-width: ${theme.breakpoints.md}) {
				margin-top: ${theme.spacing[3]};
			}

			@media (max-width: ${theme.breakpoints.sm}) {
				margin-top: ${theme.spacing[2]};
			}
		}

		@media (max-width: ${theme.breakpoints.md}) {
			margin-top: ${theme.spacing[10]};
			margin-bottom: ${theme.spacing[5]};
			line-height: 1.3;
		}

		@media (max-width: ${theme.breakpoints.sm}) {
			margin-top: ${theme.spacing[8]};
			margin-bottom: ${theme.spacing[4]};
			line-height: 1.3;
		}
	}

	h1 {
		font-size: ${theme.fontSize['5xl']};

		@media (max-width: ${theme.breakpoints.md}) {
			font-size: ${theme.fontSize['3xl']};
		}

		@media (max-width: ${theme.breakpoints.sm}) {
			font-size: ${theme.fontSize['2xl']};
		}
	}
	h2 {
		font-size: ${theme.fontSize['3xl']};

		@media (max-width: ${theme.breakpoints.md}) {
			font-size: ${theme.fontSize['2xl']};
		}

		@media (max-width: ${theme.breakpoints.sm}) {
			font-size: ${theme.fontSize.xl};
		}
	}
	h3 {
		font-size: ${theme.fontSize['2xl']};

		@media (max-width: ${theme.breakpoints.md}) {
			font-size: ${theme.fontSize.xl};
		}

		@media (max-width: ${theme.breakpoints.sm}) {
			font-size: ${theme.fontSize.lg};
		}
	}
	h4 {
		font-size: ${theme.fontSize.xl};

		@media (max-width: ${theme.breakpoints.sm}) {
			font-size: ${theme.fontSize.lg};
		}
	}
	h5 {
		font-size: ${theme.fontSize.lg};

		@media (max-width: ${theme.breakpoints.sm}) {
			font-size: ${theme.fontSize.base};
		}
	}
	h6 {
		font-size: ${theme.fontSize.base};

		@media (max-width: ${theme.breakpoints.sm}) {
			font-size: ${theme.fontSize.sm};
		}
	}

	/* Paragraph styles */
	p {
		margin-bottom: ${theme.spacing[5]};
		font-size: inherit; /* Inherit responsive font size from parent */
		line-height: 1.6;
		text-align: left;

		@media (max-width: ${theme.breakpoints.md}) {
			margin-bottom: ${theme.spacing[4]};
			line-height: 1.5;
		}

		@media (max-width: ${theme.breakpoints.sm}) {
			margin-bottom: ${theme.spacing[3]};
			line-height: 1.5;
		}
	}

	/* List styles */
	ul,
	ol {
		margin: ${theme.spacing[5]} 0;
		padding-left: ${theme.spacing[6]};
		line-height: 1.6;

		@media (max-width: ${theme.breakpoints.md}) {
			margin: ${theme.spacing[4]} 0;
			padding-left: ${theme.spacing[5]};
			line-height: 1.5;
		}

		@media (max-width: ${theme.breakpoints.sm}) {
			margin: ${theme.spacing[3]} 0;
			padding-left: ${theme.spacing[4]};
			line-height: 1.5;
		}
	}

	li {
		margin-bottom: ${theme.spacing[2]};

		@media (max-width: ${theme.breakpoints.md}) {
			margin-bottom: ${theme.spacing[1]};
		}

		@media (max-width: ${theme.breakpoints.sm}) {
			margin-bottom: ${theme.spacing[1]};
		}

		/* Nested lists */
		ul,
		ol {
			margin: ${theme.spacing[2]} 0;
			margin-bottom: ${theme.spacing[1]};

			@media (max-width: ${theme.breakpoints.md}) {
				margin: ${theme.spacing[1]} 0;
			}
		}
	}

	/* Strong and emphasis */
	strong {
		font-weight: 600;
		color: ${theme.colors.text};
	}

	em {
		font-style: italic;
		color: ${theme.colors.textSecondary};
	}

	/* Image styles */
	img {
		max-width: 100%;
		height: auto;
		border-radius: ${theme.borderRadius.md};
		margin: ${theme.spacing[4]} auto;
		display: block;
		width: auto;
		box-sizing: border-box;

		@media (max-width: ${theme.breakpoints.md}) {
			margin: ${theme.spacing[3]} auto;
			border-radius: ${theme.borderRadius.sm};
			max-width: 100%;
			width: auto;
		}

		@media (max-width: ${theme.breakpoints.sm}) {
			margin: ${theme.spacing[2]} auto;
			border-radius: ${theme.borderRadius.sm};
			max-width: calc(100vw - ${theme.spacing[2]});
			width: auto;
			height: auto;
		}
	}

	/* Link styles */
	a {
		color: ${theme.colors.linkText};
		text-decoration: none;
		transition: ${theme.transitions.fast};

		&:hover {
			color: ${theme.colors.primary};
			text-decoration: none;
		}

		&:focus {
			outline: 2px solid ${theme.colors.primary};
			outline-offset: 2px;
		}
	}

	/* Code styles */
	code {
		background: ${theme.colors.codeBackground};
		color: ${theme.colors.codeText};
		padding: 0.125rem 0.25rem;
		border-radius: ${theme.borderRadius.sm};
		font-family: ${theme.fonts.mono};
		font-size: ${theme.fontSize.sm};
		word-break: break-all; /* Allow breaking long code snippets */

		@media (max-width: ${theme.breakpoints.md}) {
			font-size: ${theme.fontSize.xs};
			padding: 0.1rem 0.2rem;
		}

		@media (max-width: ${theme.breakpoints.sm}) {
			font-size: ${theme.fontSize.xs};
			padding: 0.05rem 0.15rem;
		}
	}

	pre {
		background: ${theme.colors.codeBackground};
		color: ${theme.colors.codeText};
		padding: ${theme.spacing[5]};
		border-radius: ${theme.borderRadius.md};
		overflow-x: auto;
		margin: ${theme.spacing[6]} 0;
		font-size: ${theme.fontSize.sm};
		line-height: 1.5;

		@media (max-width: ${theme.breakpoints.md}) {
			padding: ${theme.spacing[4]};
			margin: ${theme.spacing[5]} 0;
			font-size: ${theme.fontSize.xs};
		}

		@media (max-width: ${theme.breakpoints.sm}) {
			padding: ${theme.spacing[3]};
			margin: ${theme.spacing[4]} 0;
			font-size: ${theme.fontSize.xs};
			border-radius: ${theme.borderRadius.sm};
		}

		code {
			background: none;
			padding: 0;
			word-break: normal; /* Don't break words in code blocks */
		}
	}

	/* Table container for horizontal scrolling */
	.table-container {
		overflow-x: auto;
		overflow-y: visible;
		margin: ${theme.spacing[6]} 0;
		width: 100%;
		box-sizing: border-box;
		-webkit-overflow-scrolling: touch; /* Smooth scrolling on iOS */
		scrollbar-width: thin; /* Firefox */

		/* Desktop with sidebar */
		@media (min-width: 1201px) {
			max-width: calc(1200px - ${theme.spacing[8]} - 250px); /* Account for TOC width */
		}

		/* Desktop without TOC but with sidebar */
		@media (min-width: 993px) and (max-width: 1200px) {
			max-width: calc(100vw - 300px - ${theme.spacing[8]}); /* Account for sidebar width */
		}

		/* No sidebar - transition zone and below */
		@media (max-width: 992px) {
			max-width: calc(100vw - ${theme.spacing[12]});
		}

		@media (max-width: ${theme.breakpoints.md}) {
			margin: ${theme.spacing[4]} 0;
			max-width: calc(100vw - ${theme.spacing[8]});
		}

		@media (max-width: ${theme.breakpoints.sm}) {
			margin: ${theme.spacing[3]} 0;
			max-width: calc(100vw - ${theme.spacing[6]});
		}
	}

	/* Table styles */
	table {
		width: 100%;
		border-collapse: collapse;
		margin: 0; /* Remove margin since container handles it */
		font-size: ${theme.fontSize.sm};
		border-radius: ${theme.borderRadius.md};
		border: 2px solid ${theme.colors.borderDark};
		table-layout: fixed; /* Fixed layout for better control */

		/* Responsive table sizing based on viewport */
		@media (min-width: 993px) {
			min-width: 600px; /* Minimum table width on desktop */
		}

		@media (max-width: 992px) {
			min-width: 500px; /* Smaller minimum on tablet */
			font-size: ${theme.fontSize.xs};
		}

		@media (max-width: ${theme.breakpoints.md}) {
			min-width: 450px; /* Even smaller on mobile */
			font-size: ${theme.fontSize.xs};
		}

		@media (max-width: ${theme.breakpoints.sm}) {
			min-width: 350px; /* Smallest on phone */
			font-size: ${theme.fontSize.xs};
			border: 1px solid ${theme.colors.borderDark};
		}
	}

	thead {
		background: ${theme.colors.backgroundSecondary};
	}

	th,
	td {
		text-align: left;
		padding: ${theme.spacing[3]} ${theme.spacing[4]};
		border: 1px solid ${theme.colors.borderDark};
		vertical-align: top;

		@media (max-width: ${theme.breakpoints.md}) {
			padding: ${theme.spacing[2]} ${theme.spacing[3]};
		}

		@media (max-width: ${theme.breakpoints.sm}) {
			padding: ${theme.spacing[1]} ${theme.spacing[2]};
		}
	}

	th {
		font-weight: 600;
		color: ${theme.colors.text};
		background: ${theme.colors.backgroundSecondary};
	}

	tbody tr:nth-of-type(even) {
		background: ${theme.colors.backgroundTertiary};
	}

	tbody tr:hover {
		background: ${theme.colors.primaryLight};
	}

	/* Table cell link styling */
	td a {
		color: ${theme.colors.primary};
		font-weight: 500;
		text-decoration: none;

		&:hover {
			text-decoration: underline;
		}
	}

	/* Blockquote/Note styles */
	blockquote {
		margin: ${theme.spacing[8]} 0;
		padding: ${theme.spacing[5]} ${theme.spacing[6]};
		border-left: 4px solid ${theme.colors.primary};
		background: ${theme.colors.primaryLight};
		border-radius: 0 ${theme.borderRadius.md} ${theme.borderRadius.md} 0;
		width: 100%;
		max-width: 100%;
		box-sizing: border-box;
		overflow-wrap: break-word;
		word-wrap: break-word;
		font-size: ${theme.fontSize.base};
		line-height: 1.6;

		@media (max-width: ${theme.breakpoints.md}) {
			margin: ${theme.spacing[6]} 0;
			padding: ${theme.spacing[4]} ${theme.spacing[5]};
			border-left-width: 3px;
			max-width: calc(100vw - ${theme.spacing[4]});
			font-size: ${theme.fontSize.sm};
			line-height: 1.5;
		}

		@media (max-width: ${theme.breakpoints.sm}) {
			margin: ${theme.spacing[5]} 0;
			padding: ${theme.spacing[3]} ${theme.spacing[4]};
			border-left-width: 2px;
			border-radius: 0 ${theme.borderRadius.sm} ${theme.borderRadius.sm} 0;
			max-width: calc(100vw - ${theme.spacing[2]});
			font-size: ${theme.fontSize.xs};
			line-height: 1.5;
		}

		p {
			margin: 0;
			color: ${theme.colors.text};
			font-size: inherit;
			line-height: inherit;
			word-wrap: break-word;
			overflow-wrap: break-word;

			&:not(:last-child) {
				margin-bottom: ${theme.spacing[3]};

				@media (max-width: ${theme.breakpoints.md}) {
					margin-bottom: ${theme.spacing[2]};
				}
			}
		}

		/* Handle nested elements */
		ul,
		ol {
			margin: ${theme.spacing[3]} 0;
			padding-left: ${theme.spacing[4]};

			@media (max-width: ${theme.breakpoints.md}) {
				margin: ${theme.spacing[2]} 0;
				padding-left: ${theme.spacing[3]};
			}
		}

		code {
			background: rgba(255, 255, 255, 0.1);
			color: ${theme.colors.text};
		}
	}

	/* Details/Summary (Collapsible) Styling - Docusaurus Style */
	details {
		border: 1px solid ${theme.colors.border};
		border-radius: ${theme.borderRadius.md};
		margin: ${theme.spacing[6]} 0;
		background: ${theme.colors.background};
		overflow: hidden;
		transition: ${theme.transitions.standard};

		@media (max-width: ${theme.breakpoints.md}) {
			margin: ${theme.spacing[4]} 0;
			border-radius: ${theme.borderRadius.sm};
		}

		@media (max-width: ${theme.breakpoints.sm}) {
			margin: ${theme.spacing[3]} 0;
		}

		&[open] {
			summary {
				border-bottom: 1px solid ${theme.colors.border};
				background: ${theme.colors.primaryLight};
				color: ${theme.colors.primary};

				&::before {
					transform: translateY(-50%) rotate(90deg);
				}
			}
		}
	}

	summary {
		background: ${theme.colors.backgroundSecondary};
		padding: ${theme.spacing[4]} ${theme.spacing[5]};
		font-weight: 600;
		font-size: ${theme.fontSize.base};
		color: ${theme.colors.text};
		cursor: pointer;
		user-select: none;
		transition: ${theme.transitions.fast};
		position: relative;
		display: block;
		line-height: 1.5;

		@media (max-width: ${theme.breakpoints.md}) {
			padding: ${theme.spacing[3]} ${theme.spacing[4]};
			font-size: ${theme.fontSize.sm};
		}

		@media (max-width: ${theme.breakpoints.sm}) {
			padding: ${theme.spacing[2]} ${theme.spacing[3]};
			font-size: ${theme.fontSize.sm};
		}

		/* Hide default disclosure triangle */
		&::-webkit-details-marker {
			display: none;
		}

		&::marker {
			display: none;
		}

		/* Custom dropdown arrow */
		&::before {
			content: '▶';
			position: absolute;
			left: ${theme.spacing[4]};
			top: 50%;
			transform: translateY(-50%);
			color: ${theme.colors.primary};
			font-size: ${theme.fontSize.sm};
			transition: transform ${theme.transitions.fast};

			@media (max-width: ${theme.breakpoints.md}) {
				left: ${theme.spacing[3]};
				font-size: ${theme.fontSize.xs};
			}

			@media (max-width: ${theme.breakpoints.sm}) {
				left: ${theme.spacing[2]};
			}
		}

		/* Add padding to account for arrow */
		padding-left: ${theme.spacing[8]};

		@media (max-width: ${theme.breakpoints.md}) {
			padding-left: ${theme.spacing[7]};
		}

		@media (max-width: ${theme.breakpoints.sm}) {
			padding-left: ${theme.spacing[6]};
		}

		&:hover {
			background: ${theme.colors.primaryLight};
			color: ${theme.colors.primary};
		}

		&:focus {
			outline: none;
			box-shadow: 0 0 0 2px rgba(11, 117, 162, 0.2);
		}

		&:focus-visible {
			outline: none;
			box-shadow: 0 0 0 2px rgba(11, 117, 162, 0.3);
		}
	}

	/* Content inside details */
	details > *:not(summary) {
		padding: ${theme.spacing[4]} ${theme.spacing[5]};
		margin: 0;
		background: ${theme.colors.backgroundTertiary};

		@media (max-width: ${theme.breakpoints.md}) {
			padding: ${theme.spacing[3]} ${theme.spacing[4]};
		}

		@media (max-width: ${theme.breakpoints.sm}) {
			padding: ${theme.spacing[3]} ${theme.spacing[3]};
		}

		&:first-of-type {
			padding-top: ${theme.spacing[4]};
		}

		&:last-child {
			padding-bottom: ${theme.spacing[4]};
		}
	}

	/* Handle paragraph spacing within details content */
	details p {
		padding: 0 ${theme.spacing[5]} ${theme.spacing[3]} ${theme.spacing[5]};
		margin: 0;
		background: ${theme.colors.backgroundTertiary};

		@media (max-width: ${theme.breakpoints.md}) {
			padding: 0 ${theme.spacing[4]} ${theme.spacing[2]} ${theme.spacing[4]};
		}

		@media (max-width: ${theme.breakpoints.sm}) {
			padding: 0 ${theme.spacing[3]} ${theme.spacing[2]} ${theme.spacing[3]};
		}

		&:first-of-type {
			padding-top: ${theme.spacing[4]};

			@media (max-width: ${theme.breakpoints.md}) {
				padding-top: ${theme.spacing[3]};
			}
		}

		&:last-child {
			padding-bottom: ${theme.spacing[4]};

			@media (max-width: ${theme.breakpoints.md}) {
				padding-bottom: ${theme.spacing[3]};
			}
		}
	}

	/* Handle lists within details */
	details ul,
	details ol {
		background: ${theme.colors.backgroundTertiary};
		padding: ${theme.spacing[2]} ${theme.spacing[5]} ${theme.spacing[3]} ${theme.spacing[8]};
		margin: 0;

		@media (max-width: ${theme.breakpoints.md}) {
			padding: ${theme.spacing[2]} ${theme.spacing[4]} ${theme.spacing[2]} ${theme.spacing[7]};
		}

		@media (max-width: ${theme.breakpoints.sm}) {
			padding: ${theme.spacing[2]} ${theme.spacing[3]} ${theme.spacing[2]} ${theme.spacing[6]};
		}
	}

	/* Code elements in details */
	details code {
		background: rgba(255, 255, 255, 0.8);
		padding: 0.25rem 0.5rem;
		border-radius: ${theme.borderRadius.sm};
		font-family: ${theme.fonts.mono};
		font-size: 0.875em;
		color: ${theme.colors.primary};
		border: 1px solid rgba(11, 117, 162, 0.2);
		white-space: nowrap;
		display: inline-block;
		margin: 0 0.125rem;
	}

	/* Code blocks in details */
	details pre {
		background: rgba(255, 255, 255, 0.9);
		padding: ${theme.spacing[4]};
		border-radius: ${theme.borderRadius.sm};
		margin: ${theme.spacing[3]} ${theme.spacing[5]};
		overflow-x: auto;
		border: 1px solid rgba(11, 117, 162, 0.15);

		@media (max-width: ${theme.breakpoints.md}) {
			margin: ${theme.spacing[2]} ${theme.spacing[4]};
			padding: ${theme.spacing[3]};
		}

		@media (max-width: ${theme.breakpoints.sm}) {
			margin: ${theme.spacing[2]} ${theme.spacing[3]};
			padding: ${theme.spacing[2]};
		}

		code {
			background: none;
			border: none;
			padding: 0;
			margin: 0;
			white-space: pre;
			display: block;
		}
	}
`;

const tocStyle = css`
	width: 250px;
	padding: ${theme.spacing[4]} ${theme.spacing[4]};
	position: fixed;
	right: ${theme.spacing[4]};
	top: 70px;
	height: calc(100vh - 70px - 47px);
	overflow-y: auto;
	z-index: 10;

	@media (max-width: 1159px) {
		display: none;
	}
`;

const tocNavStyle = css`
	border-left: 1px solid ${theme.colors.primary};
	padding-left: ${theme.spacing[4]};
`;

const tocListStyle = css`
	list-style: none;
	margin: 0;
	padding: 0;
`;

const tocItemStyle = css`
	margin: ${theme.spacing[1]} 0;
`;

const tocLinkStyle = css`
	display: block;
	color: ${theme.colors.textSecondary};
	text-decoration: none;
	font-size: ${theme.fontSize.xs};
	line-height: ${theme.lineHeight.tight};
	padding: ${theme.spacing[1]} 0;
	transition: ${theme.transitions.fast};

	&:hover {
		color: ${theme.colors.primary};
	}
`;

const noContentStyle = css`
	padding: ${theme.spacing[8]} ${theme.spacing[4]};
	text-align: center;
	color: ${theme.colors.textSecondary};

	h2 {
		margin-bottom: ${theme.spacing[4]};
		color: ${theme.colors.text};
	}
`;

export default DocumentationPage;
