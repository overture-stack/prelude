import { css, useTheme } from '@emotion/react';
import Link from 'next/link';
import { ReactElement, useMemo, useRef } from 'react';
import { DocumentationData } from '../../../lib/documentation';
import { StageThemeInterface } from '../../theme';
import { createDocumentationTheme } from '../../theme/adapters/documentation';
import FundingStatement from './FundingStatement';
import { useCodeBlockCopyButtons } from './utils/useCodeBlockCopyButtons';
import { useDictionaryHydration } from './utils/useDictionaryHydration';
import { useHeadingAnchors } from './utils/useHeadingAnchors';
import { useMermaidDiagrams } from './utils/useMermaidDiagrams';

const DocumentationPage = ({ sections, currentSection, headings, categoryLabels }: DocumentationData): ReactElement => {
	const getCategoryLabel = (category: string) =>
		categoryLabels[category] ?? category.charAt(0).toUpperCase() + category.slice(1);
	const contentRef = useRef<HTMLDivElement>(null);

	const stageTheme = useTheme() as StageThemeInterface;
	const theme = useMemo(() => createDocumentationTheme(stageTheme), [stageTheme]);
	const styles = useMemo(() => getStyles(theme), [theme]);

	useDictionaryHydration(contentRef, currentSection);
	useHeadingAnchors(contentRef, currentSection);
	useCodeBlockCopyButtons(contentRef, currentSection);
	useMermaidDiagrams(contentRef, currentSection);

	// Group sections by category, preserving insertion order
	const groupedSections = useMemo(() => {
		const groups = new Map<string, typeof sections>();
		for (const section of sections) {
			const cat = section.category ?? 'general';
			if (!groups.has(cat)) groups.set(cat, []);
			groups.get(cat)!.push(section);
		}
		return groups;
	}, [sections]);

	return (
		<div css={styles.container}>
			<aside css={styles.sidebar}>
				<nav css={styles.nav}>
					<h3 css={styles.sidebarTitle}>Documentation</h3>
					{Array.from(groupedSections.entries()).map(([category, categorySections]) => (
						<div key={category} css={styles.navCategory}>
							<p css={styles.navCategoryLabel}>{getCategoryLabel(category)}</p>
							<ul css={styles.navList}>
								{categorySections.map((section) => (
									<li key={`${category}/${section.id}`} css={styles.navItem}>
										<Link href={`/documentation/${category}/${section.id}`}>
											<a
												css={styles.navLink}
												className={
													currentSection?.id === section.id && currentSection?.category === category ? 'active' : ''
												}
											>
												{section.title}
											</a>
										</Link>
									</li>
								))}
							</ul>
						</div>
					))}
				</nav>
				<FundingStatement />
			</aside>

			<main css={styles.mainContent}>
				{currentSection ? (
					<>
						<div css={styles.contentContainer}>
							<article css={styles.article}>
								<div
									ref={contentRef}
									css={styles.markdownContent}
									dangerouslySetInnerHTML={{ __html: currentSection.htmlContent }}
								/>
							</article>
						</div>
						{headings.length > 0 && (
							<aside css={styles.toc}>
								<p css={styles.tocLabel}>On this page</p>
								<nav css={styles.tocNav}>
									<ul css={styles.tocList}>
										{headings.map((heading) => (
											<li key={heading.id} css={styles.tocItem} data-level={heading.level}>
												<a href={`#${heading.id}`} css={styles.tocLink}>
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
					<div css={styles.noContent}>
						<h2>No Content Available</h2>
						<p>The requested documentation section could not be found.</p>
					</div>
				)}
			</main>
		</div>
	);
};

// Style generator function that takes the documentation theme
const getStyles = (theme: ReturnType<typeof createDocumentationTheme>) => ({
	container: css`
		display: flex;
		min-height: 100vh;
		background-color: ${theme.colors.background};
		padding-bottom: 47px;
		width: 100%;
		max-width: 100vw;
		box-sizing: border-box;
		scroll-behavior: smooth;
	`,

	sidebar: css`
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
	`,

	nav: css`
		padding: ${theme.spacing[6]} ${theme.spacing[4]};
		flex: 1;
	`,

	sidebarTitle: css`
		font-size: ${theme.fontSize.lg};
		font-weight: 600;
		color: ${theme.colors.text};
		margin: 0 0 ${theme.spacing[4]} 0;
		padding-bottom: ${theme.spacing[3]};
		padding-left: ${theme.spacing[3]};
		border-bottom: 1px solid ${theme.colors.sidebarBorder};
	`,

	navCategory: css`
		margin-bottom: ${theme.spacing[4]};

		& + & {
			border-top: 1px solid ${theme.colors.border};
			padding-top: ${theme.spacing[4]};
		}
	`,

	navCategoryLabel: css`
		font-size: ${theme.fontSize.xs};
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: ${theme.colors.text};
		margin: 0 0 ${theme.spacing[2]} 0;
		padding: 3px ${theme.spacing[3]};
	`,

	navList: css`
		list-style: none;
		margin: 0;
		padding: 0;
	`,

	navItem: css`
		margin: ${theme.spacing[1]} 0;
	`,

	navLink: css`
		display: block;
		padding: ${theme.spacing[2]} ${theme.spacing[3]};
		color: ${theme.colors.textSecondary};
		text-decoration: none;
		font-size: ${theme.fontSize.sm};
		font-weight: 400;
		line-height: ${theme.lineHeight.base};
		transition: ${theme.transitions.fast};
		border-left: 3px solid transparent;
		cursor: pointer;
		user-select: none;

		&:hover {
			background: ${theme.colors.sidebarItemBackgroundHover};
			color: ${theme.colors.text};
		}

		&.active {
			background: ${theme.colors.sidebarItemBackgroundActive};
			color: ${theme.colors.primaryDark};
			font-weight: 600;
			border-left-color: ${theme.colors.primaryDark};
		}

		&:focus-visible {
			outline: 2px solid ${theme.colors.primaryDark};
			outline-offset: 2px;
			border-radius: 2px;
		}
	`,

	mainContent: css`
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
	`,

	contentContainer: css`
		margin: 0;
		padding: 0 ${theme.spacing[6]};
		width: 100%;
		box-sizing: border-box;

		@media (min-width: 1160px) {
			max-width: calc(100% - 280px);
			padding-right: ${theme.spacing[8]};
		}

		@media (max-width: ${theme.breakpoints.md}) {
			padding: 0 ${theme.spacing[5]};
		}

		@media (max-width: ${theme.breakpoints.sm}) {
			padding: 0 ${theme.spacing[4]};
		}
	`,

	article: css`
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
	`,

	markdownContent: css`
		font-family: ${theme.fonts.base};
		line-height: 1.6;
		color: ${theme.colors.text};
		word-wrap: break-word;
		overflow-wrap: break-word;
		font-size: ${theme.fontSize.base};
		box-sizing: border-box;

		@media (max-width: ${theme.breakpoints.md}) {
			font-size: ${theme.fontSize.sm};
			line-height: 1.5;
		}

		@media (max-width: ${theme.breakpoints.sm}) {
			font-size: ${theme.fontSize.xs};
			line-height: 1.5;
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
			margin-top: ${theme.spacing[8]};
			margin-bottom: ${theme.spacing[3]};
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
				margin-top: ${theme.spacing[6]};
				margin-bottom: ${theme.spacing[3]};
				line-height: 1.3;
			}

			@media (max-width: ${theme.breakpoints.sm}) {
				margin-top: ${theme.spacing[5]};
				margin-bottom: ${theme.spacing[2]};
				line-height: 1.3;
			}
		}

		h1 {
			font-size: ${theme.fontSize['3xl']};

			@media (max-width: ${theme.breakpoints.md}) {
				font-size: ${theme.fontSize['2xl']};
			}
		}
		h2 {
			font-size: ${theme.fontSize['2xl']};
			padding-bottom: ${theme.spacing[2]};
			border-bottom: 1px solid ${theme.colors.border};

			@media (max-width: ${theme.breakpoints.md}) {
				font-size: ${theme.fontSize.xl};
			}
		}
		h3 {
			font-size: ${theme.fontSize.xl};

			@media (max-width: ${theme.breakpoints.md}) {
				font-size: ${theme.fontSize.lg};
			}
		}
		h4 {
			font-size: ${theme.fontSize.lg};
		}
		h5 {
			font-size: ${theme.fontSize.base};
		}
		h6 {
			font-size: ${theme.fontSize.sm};
			color: ${theme.colors.textSecondary};
		}

		/* Paragraph styles */
		p {
			margin-bottom: ${theme.spacing[4]};
			font-size: inherit; /* Inherit responsive font size from parent */
			line-height: 1.6;
			text-align: left;

			@media (max-width: ${theme.breakpoints.md}) {
				margin-bottom: ${theme.spacing[3]};
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
			margin: ${theme.spacing[4]} 0;
			padding-left: ${theme.spacing[6]};
			line-height: 1.6;

			@media (max-width: ${theme.breakpoints.md}) {
				margin: ${theme.spacing[3]} 0;
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

			/* Nested lists */
			ul,
			ol {
				margin: ${theme.spacing[2]} 0 ${theme.spacing[1]};

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

		/* Mermaid diagram viewer */
		.mermaid-viewer {
			position: relative;
			margin: ${theme.spacing[6]} 0;
			border: 1px solid ${theme.colors.border};
			border-radius: ${theme.borderRadius.md};
			overflow: hidden;
			background: ${theme.colors.backgroundSecondary};

			&:hover .mermaid-toolbar {
				opacity: 1;
			}
		}

		.mermaid-toolbar {
			position: absolute;
			top: ${theme.spacing[2]};
			right: ${theme.spacing[2]};
			display: flex;
			gap: ${theme.spacing[1]};
			z-index: 10;
			opacity: 0;
			transition: opacity 0.15s ease;
		}

		.mermaid-toolbar-btn {
			display: flex;
			align-items: center;
			justify-content: center;
			width: 28px;
			height: 28px;
			padding: 0;
			background: ${theme.colors.background};
			color: ${theme.colors.textSecondary};
			border: 1px solid ${theme.colors.border};
			border-radius: ${theme.borderRadius.sm};
			font-size: 16px;
			line-height: 1;
			cursor: pointer;
			transition:
				color 0.15s ease,
				border-color 0.15s ease;

			&:hover {
				color: ${theme.colors.primary};
				border-color: ${theme.colors.primary};
			}
		}

		.mermaid-canvas {
			width: 100%;
			cursor: grab;
			transform-origin: 0 0;
			will-change: transform;
			display: block;
		}

		.mermaid-diagram {
			padding: ${theme.spacing[4]};

			svg {
				display: block;
				width: 100%;
				height: auto;
				max-width: 100%;
			}
		}

		/* Image styles */
		img {
			max-width: 100%;
			height: auto;
			border-radius: ${theme.borderRadius.md};
			margin: ${theme.spacing[4]} auto;
			display: block;
			box-sizing: border-box;

			@media (max-width: ${theme.breakpoints.md}) {
				margin: ${theme.spacing[3]} auto;
				border-radius: ${theme.borderRadius.sm};
			}

			@media (max-width: ${theme.breakpoints.sm}) {
				margin: ${theme.spacing[2]} auto;
				max-width: calc(100vw - ${theme.spacing[2]});
			}
		}

		/* Link styles */
		a {
			color: ${theme.colors.linkText};
			text-decoration: underline;
			transition: ${theme.transitions.fast};

			&:hover {
				color: ${theme.colors.primaryDark};
				text-decoration: underline;
			}

			&:focus-visible {
				outline: 2px solid ${theme.colors.primaryDark};
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
			word-break: break-all;

			@media (max-width: ${theme.breakpoints.md}) {
				font-size: ${theme.fontSize.xs};
				padding: 0.1rem 0.2rem;
			}

			@media (max-width: ${theme.breakpoints.sm}) {
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
			position: relative;

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

			.copy-code-button {
				position: absolute;
				top: ${theme.spacing[2]};
				right: ${theme.spacing[2]};
				padding: ${theme.spacing[1]} ${theme.spacing[2]};
				background: ${theme.colors.background};
				color: ${theme.colors.textSecondary};
				border: 1px solid ${theme.colors.border};
				border-radius: ${theme.borderRadius.md};
				font-size: ${theme.fontSize.xs};
				font-family: ${theme.fonts.base};
				cursor: pointer;
				opacity: 0;
				transition:
					opacity 0.15s ease,
					color 0.15s ease;
				line-height: 1;

				&:hover {
					color: ${theme.colors.primary};
					border-color: ${theme.colors.primary};
				}

				&.copied {
					color: ${theme.colors.text};
					border-color: ${theme.colors.secondary};
				}
			}

			&:hover .copy-code-button {
				opacity: 1;
			}
		}

		/* Table container for horizontal scrolling */
		.table-container {
			overflow-x: auto;
			overflow-y: visible;
			margin: ${theme.spacing[6]} 0;
			width: 100%;
			box-sizing: border-box;
			-webkit-overflow-scrolling: touch;
			scrollbar-width: thin;

			@media (min-width: 1201px) {
				max-width: calc(1200px - ${theme.spacing[8]} - 250px);
			}

			@media (min-width: 993px) and (max-width: 1200px) {
				max-width: calc(100vw - 300px - ${theme.spacing[8]});
			}

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
			margin: 0;
			font-size: ${theme.fontSize.sm};
			border-radius: ${theme.borderRadius.md};
			border: 2px solid ${theme.colors.borderDark};
			table-layout: fixed;
			min-width: 600px;

			@media (max-width: 992px) {
				min-width: 450px;
				font-size: ${theme.fontSize.xs};
			}

			@media (max-width: ${theme.breakpoints.sm}) {
				min-width: 350px;
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

		/* Blockquote styles */
		blockquote {
			margin: ${theme.spacing[8]} 0;
			padding: ${theme.spacing[5]} ${theme.spacing[6]};
			border-left: 4px solid ${theme.colors.primary};
			background: ${theme.colors.primaryLight};
			border-radius: 0 ${theme.borderRadius.md} ${theme.borderRadius.md} 0;
			box-sizing: border-box;
			overflow-wrap: break-word;
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
				font-size: inherit;
				line-height: inherit;

				&:not(:last-child) {
					margin-bottom: ${theme.spacing[3]};

					@media (max-width: ${theme.breakpoints.md}) {
						margin-bottom: ${theme.spacing[2]};
					}
				}
			}

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
				background: color-mix(in srgb, ${theme.colors.primary} 10%, white);
				color: ${theme.colors.text};
			}
		}

		/* Admonition (:::type) callout blocks — Docusaurus full-border style */
		.admonition {
			margin: ${theme.spacing[5]} 0;
			border: 1px solid transparent;
			border-radius: ${theme.borderRadius.lg};
			overflow: hidden;
			box-sizing: border-box;

			@media (max-width: ${theme.breakpoints.md}) {
				margin: ${theme.spacing[4]} 0;
				border-radius: ${theme.borderRadius.md};
			}
		}

		.admonition-info {
			border-color: ${theme.colors.primary};
			.admonition-heading {
				background: ${theme.colors.primary};
				color: white;
			}
			.admonition-content {
				background: ${theme.colors.primaryLight};
			}
		}

		.admonition-tip {
			border-color: ${theme.colors.secondary};
			.admonition-heading {
				background: ${theme.colors.secondary};
				color: ${theme.colors.text};
			}
			.admonition-content {
				background: ${theme.colors.secondaryLight};
			}
		}

		.admonition-caution,
		.admonition-warning {
			border-color: color-mix(in srgb, ${theme.colors.warning} 80%, black);
			.admonition-heading {
				background: ${theme.colors.warning};
				color: color-mix(in srgb, ${theme.colors.warning} 30%, black);
			}
			.admonition-content {
				background: color-mix(in srgb, ${theme.colors.warning} 20%, white);
			}
		}

		.admonition-important,
		.admonition-danger {
			border-color: ${theme.colors.accent1};
			.admonition-heading {
				background: ${theme.colors.accent1};
				color: white;
			}
			.admonition-content {
				background: color-mix(in srgb, ${theme.colors.accent1} 12%, white);
			}
		}

		.admonition-note {
			border-color: ${theme.colors.borderDark};
			.admonition-heading {
				background: ${theme.colors.borderDark};
				color: ${theme.colors.text};
			}
			.admonition-content {
				background: ${theme.colors.backgroundSecondary};
			}
		}

		.admonition-heading {
			display: flex;
			align-items: center;
			gap: ${theme.spacing[2]};
			padding: ${theme.spacing[2]} ${theme.spacing[4]};
			font-weight: 700;
			font-size: ${theme.fontSize.xs};
			text-transform: uppercase;
			letter-spacing: 0.08em;

			svg {
				display: block;
				flex-shrink: 0;
			}
		}

		.admonition-content {
			padding: ${theme.spacing[3]} ${theme.spacing[4]};

			@media (max-width: ${theme.breakpoints.md}) {
				padding: ${theme.spacing[3]};
			}

			> *:first-child {
				margin-top: 0;
			}
			> *:last-child {
				margin-bottom: 0;
			}

			p {
				font-size: ${theme.fontSize.sm};
				line-height: 1.6;
				margin-bottom: ${theme.spacing[3]};

				&:last-child {
					margin-bottom: 0;
				}
			}

			ul,
			ol {
				margin: ${theme.spacing[2]} 0;
				padding-left: ${theme.spacing[5]};
				font-size: ${theme.fontSize.sm};
			}

			code {
				background: ${theme.colors.background};
				font-size: 0.875em;
			}

			pre {
				margin: ${theme.spacing[3]} 0 0;
				background: ${theme.colors.background};
				border: 1px solid ${theme.colors.border};

				code {
					background: none;
				}
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
					background: color-mix(in srgb, ${theme.colors.sidebarItemBackgroundActive} 65%, #bbddff);
					color: ${theme.colors.text};

					&::before {
						transform: translateY(-50%) rotate(90deg);
						color: ${theme.colors.text};
					}
				}
			}
		}

		summary {
			background: ${theme.colors.sidebarItemBackgroundActive};
			padding: ${theme.spacing[4]} ${theme.spacing[5]} ${theme.spacing[4]} ${theme.spacing[8]};
			font-weight: 600;
			font-size: ${theme.fontSize.base};
			color: black;
			cursor: pointer;
			user-select: none;
			transition: ${theme.transitions.fast};
			position: relative;
			display: block;
			line-height: 1.5;

			@media (max-width: ${theme.breakpoints.md}) {
				padding: ${theme.spacing[3]} ${theme.spacing[4]} ${theme.spacing[3]} ${theme.spacing[7]};
				font-size: ${theme.fontSize.sm};
			}

			@media (max-width: ${theme.breakpoints.sm}) {
				padding: ${theme.spacing[2]} ${theme.spacing[3]} ${theme.spacing[2]} ${theme.spacing[6]};
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
				color: black;
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

			&:hover {
				background: color-mix(in srgb, ${theme.colors.sidebarItemBackgroundActive} 65%, #bbddff);
				color: black;
			}

			&:focus {
				outline: none;
				box-shadow: 0 0 0 2px color-mix(in srgb, ${theme.colors.primary} 20%, transparent);
			}

			&:focus-visible {
				outline: none;
				box-shadow: 0 0 0 2px color-mix(in srgb, ${theme.colors.primary} 30%, transparent);
			}
		}

		/* Content inside details — consistent with main content */
		details > *:not(summary) {
			padding-left: ${theme.spacing[5]};
			padding-right: ${theme.spacing[5]};

			@media (max-width: ${theme.breakpoints.md}) {
				padding-left: ${theme.spacing[4]};
				padding-right: ${theme.spacing[4]};
			}

			@media (max-width: ${theme.breakpoints.sm}) {
				padding-left: ${theme.spacing[3]};
				padding-right: ${theme.spacing[3]};
			}
		}

		/* First content element after summary gets top padding */
		details > summary + * {
			padding-top: ${theme.spacing[4]};
		}

		/* Last content element gets bottom padding */
		details > *:not(summary):last-child {
			padding-bottom: ${theme.spacing[4]};
		}

		/* Restore natural list indentation inside details (overridden by the container padding rule) */
		details ul,
		details ol {
			padding-left: calc(${theme.spacing[5]} + ${theme.spacing[6]});
		}

		/* Give code blocks inside details breathing room on left and right */
		details pre {
			margin-left: ${theme.spacing[5]};
			margin-right: ${theme.spacing[5]};
		}

		/* Tables rendered from markdown are raw <table> elements (no wrapper).
		   The generic details > *:not(summary) padding rule applies to them but
		   <table> ignores padding-left/right for its own box, so we need to
		   shrink the table's width and offset it with margin. */
		details > table {
			width: calc(100% - ${theme.spacing[5]} * 2);
			margin-left: ${theme.spacing[5]};
			margin-right: ${theme.spacing[5]};
			padding-left: 0;
			padding-right: 0;

			@media (max-width: ${theme.breakpoints.md}) {
				width: calc(100% - ${theme.spacing[4]} * 2);
				margin-left: ${theme.spacing[4]};
				margin-right: ${theme.spacing[4]};
			}

			@media (max-width: ${theme.breakpoints.sm}) {
				width: calc(100% - ${theme.spacing[3]} * 2);
				margin-left: ${theme.spacing[3]};
				margin-right: ${theme.spacing[3]};
			}
		}
	`,

	toc: css`
		width: 250px;
		padding: ${theme.spacing[4]};
		position: fixed;
		right: ${theme.spacing[4]};
		top: 70px;
		height: calc(100vh - 70px - 47px);
		overflow-y: auto;
		z-index: 10;

		@media (max-width: 1159px) {
			display: none;
		}
	`,

	tocLabel: css`
		font-size: ${theme.fontSize.xs};
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: ${theme.colors.textSecondary};
		margin: 0 0 ${theme.spacing[3]} 0;
	`,

	tocNav: css`
		border-left: 1px solid ${theme.colors.border};
		padding-left: ${theme.spacing[3]};
	`,

	tocList: css`
		list-style: none;
		margin: 0;
		padding: 0;
	`,

	tocItem: css`
		margin: ${theme.spacing[1]} 0;

		&[data-level='3'] {
			padding-left: ${theme.spacing[4]};
		}
	`,

	tocLink: css`
		display: block;
		color: ${theme.colors.textSecondary};
		text-decoration: none;
		font-size: ${theme.fontSize.xs};
		line-height: ${theme.lineHeight.tight};
		padding: ${theme.spacing[1]} 0;
		transition: ${theme.transitions.fast};

		&:hover {
			color: ${theme.colors.primaryDark};
		}

		&:focus-visible {
			outline: 2px solid ${theme.colors.primaryDark};
			outline-offset: 2px;
			border-radius: 2px;
		}
	`,

	noContent: css`
		padding: ${theme.spacing[8]} ${theme.spacing[4]};
		text-align: center;
		color: ${theme.colors.textSecondary};

		h2 {
			margin-bottom: ${theme.spacing[4]};
			color: ${theme.colors.text};
		}
	`,
});

export default DocumentationPage;
