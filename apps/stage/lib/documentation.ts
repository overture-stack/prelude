/**
 * Static documentation loader for build-time processing
 * Eliminates all client-side async loading complexity
 */

import fs from 'fs';
import path from 'path';
import { marked } from 'marked';

// Custom ID generation function to match our TOC links
function generateHeadingId(text: string): string {
	return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export interface DocumentationSection {
	id: string;
	title: string;
	content: string;
	htmlContent: string;
	order: number;
	filePath: string;
}

export interface DocumentationHeading {
	id: string;
	text: string;
	level: 1 | 2 | 3 | 4 | 5 | 6;
}

export interface DocumentationData {
	sections: Omit<DocumentationSection, 'content' | 'htmlContent'>[];
	currentSection: DocumentationSection | null;
	headings: DocumentationHeading[];
}

/**
 * Load all documentation sections at build time
 */
export async function loadDocumentationSections(): Promise<DocumentationSection[]> {
	const docsDirectory = path.join(process.cwd(), 'public/docs');

	// Check if docs directory exists
	if (!fs.existsSync(docsDirectory)) {
		console.warn('Documentation directory not found:', docsDirectory);
		return [];
	}

	const fileNames = fs.readdirSync(docsDirectory);
	const markdownFiles = fileNames.filter(name => name.endsWith('.md'));

	const sections = await Promise.all(
		markdownFiles.map(async (fileName) => {
			const filePath = path.join(docsDirectory, fileName);
			const fileContent = fs.readFileSync(filePath, 'utf8');

			// Extract title from first heading or filename
			const title = extractTitle(fileContent) || fileName.replace('.md', '');

			// Generate ID from filename
			const id = generateId(fileName);

			// Extract order from filename prefix
			const order = extractOrder(fileName);

			// Process admonitions and custom components before markdown rendering
			const withAdmonitions = await processAdmonitions(fileContent);
			const processedContent = processCustomComponents(withAdmonitions);

			// Convert markdown to HTML with custom heading IDs
			const htmlContent = await marked(processedContent);

			// Post-process: normalise heading IDs and rewrite relative image paths
			const processedHtml = htmlContent
				.replace(
					/<h([1-6])(?:\s+id="[^"]*")?\s*>([^<]+)<\/h[1-6]>/g,
					(_match, level, text) => {
						const id = generateHeadingId(text);
						return `<h${level} id="${id}">${text}</h${level}>`;
					},
				)
				.replace(/(<img\s[^>]*src=")(?!\/|https?:\/\/)([^"]+)"/g, '$1/docs/$2"')
			.replace(/<summary>([\s\S]*?)<\/summary>/g, (_m, content) => {
				// Unwrap redundant <strong> wrappers so nested **markdown** can be processed cleanly
				let c = content.replace(/<strong>([\s\S]*?)<\/strong>/g, '$1');
				c = c
					.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
					.replace(/`([^`\n]+)`/g, '<code>$1</code>')
					.replace(/\*([^*\n]+)\*/g, '<em>$1</em>');
				return `<summary>${c}</summary>`;
			});

			return {
				id,
				title,
				content: fileContent,
				htmlContent: processedHtml,
				order,
				filePath: fileName,
			};
		})
	);

	// Sort by order
	return sections.sort((a, b) => a.order - b.order);
}

/**
 * Get documentation data for a specific section
 * Optimized to only load necessary data
 */
export async function getDocumentationData(sectionId?: string): Promise<DocumentationData> {
	const sections = await loadDocumentationSectionsSummary(); // Load only titles and IDs for navigation

	// Find and load the current section with full content
	let currentSection: DocumentationSection | null = null;
	if (sectionId) {
		currentSection = await loadSingleSection(sectionId);
	}

	// Default to first section if none specified
	if (!currentSection && sections.length > 0) {
		currentSection = await loadSingleSection(sections[0].id);
	}

	// Extract headings from current section
	const headings = currentSection ? extractHeadings(currentSection.content) : [];

	return {
		sections,
		currentSection,
		headings,
	};
}

/**
 * Load only section summaries for navigation (lightweight)
 */
export async function loadDocumentationSectionsSummary(): Promise<Omit<DocumentationSection, 'content' | 'htmlContent'>[]> {
	const docsDirectory = path.join(process.cwd(), 'public/docs');

	if (!fs.existsSync(docsDirectory)) {
		console.warn('Documentation directory not found:', docsDirectory);
		return [];
	}

	const fileNames = fs.readdirSync(docsDirectory);
	const markdownFiles = fileNames.filter(name => name.endsWith('.md'));

	const sections = markdownFiles.map((fileName) => {
		const filePath = path.join(docsDirectory, fileName);
		const fileContent = fs.readFileSync(filePath, 'utf8');

		// Extract only the title (don't process full content)
		const title = extractTitle(fileContent) || fileName.replace('.md', '');
		const id = generateId(fileName);
		const order = extractOrder(fileName);

		return {
			id,
			title,
			order,
			filePath: fileName,
		};
	});

	return sections.sort((a, b) => a.order - b.order);
}

/**
 * Load a single section with full content
 */
export async function loadSingleSection(sectionId: string): Promise<DocumentationSection | null> {
	const docsDirectory = path.join(process.cwd(), 'public/docs');
	const fileNames = fs.readdirSync(docsDirectory);
	const markdownFiles = fileNames.filter(name => name.endsWith('.md'));

	// Find the file that matches the section ID
	const fileName = markdownFiles.find(name => generateId(name) === sectionId);
	if (!fileName) {
		return null;
	}

	const filePath = path.join(docsDirectory, fileName);
	const fileContent = fs.readFileSync(filePath, 'utf8');

	const title = extractTitle(fileContent) || fileName.replace('.md', '');
	const id = generateId(fileName);
	const order = extractOrder(fileName);

	// Process admonitions and custom components before markdown rendering
	const withAdmonitions = await processAdmonitions(fileContent);
	const processedContent = processCustomComponents(withAdmonitions);

	// Convert markdown to HTML with custom heading IDs
	const htmlContent = await marked(processedContent);

	// Post-process: normalise heading IDs and rewrite relative image paths
	const processedHtml = htmlContent
		.replace(
			/<h([1-6])(?:\s+id="[^"]*")?\s*>([^<]+)<\/h[1-6]>/g,
			(_match, level, text) => {
				const id = generateHeadingId(text);
				return `<h${level} id="${id}">${text}</h${level}>`;
			},
		)
		.replace(/(<img\s[^>]*src=")(?!\/|https?:\/\/)([^"]+)"/g, '$1/docs/$2"');

	return {
		id,
		title,
		content: fileContent,
		htmlContent: processedHtml,
		order,
		filePath: fileName,
	};
}

/**
 * Get all section IDs for static path generation
 */
export async function getAllSectionIds(): Promise<string[]> {
	const sections = await loadDocumentationSectionsSummary();
	return sections.map(section => section.id);
}

// Utility functions
function extractTitle(content: string): string | null {
	const titleMatch = content.match(/^#\s+(.+)$/m);
	return titleMatch ? titleMatch[1].trim() : null;
}

function generateId(fileName: string): string {
	return fileName
		.replace(/^\d+-/, '') // Remove number prefix
		.replace(/\.md$/, '') // Remove .md extension
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with dashes
		.replace(/(^-|-$)/g, ''); // Remove leading/trailing dashes
}

function extractOrder(fileName: string): number {
	const orderMatch = fileName.match(/^(\d+)-/);
	return orderMatch ? parseInt(orderMatch[1], 10) : 999;
}

function extractHeadings(content: string): DocumentationHeading[] {
	const headings: DocumentationHeading[] = [];
	const headingRegex = /^(#{1,6})\s+(.+)$/gm;

	let match;
	while ((match = headingRegex.exec(content)) !== null) {
		const level = match[1].length as 1 | 2 | 3 | 4 | 5 | 6;
		const text = match[2].trim();
		const id = generateHeadingId(text); // Use consistent ID generation

		// Include h2 and h3 headings in TOC
		if (level === 2 || level === 3) {
			headings.push({ id, text, level });
		}
	}

	return headings;
}

const ADMONITION_ICONS: Record<string, string> = {
	info: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>`,
	tip: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7z"/></svg>`,
	caution: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>`,
	warning: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>`,
	important: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2V11h2v6zm0-8h-2V7h2v2z"/></svg>`,
	danger: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>`,
	note: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>`,
};

/**
 * Convert :::type [optional title]\ncontent\n::: blocks into styled HTML divs.
 * Inner content is rendered as markdown independently so inline formatting works.
 */
async function processAdmonitions(content: string): Promise<string> {
	const admonitionRegex = /^:::(\w+)([ \t][^\n]*)?\n([\s\S]*?)^:::/gm;
	const matches: Array<{ match: string; html: string }> = [];

	let m: RegExpExecArray | null;
	while ((m = admonitionRegex.exec(content)) !== null) {
		const type = m[1].toLowerCase();
		const customTitle = m[2] ? m[2].trim() : '';
		const displayTitle = customTitle || (type.charAt(0).toUpperCase() + type.slice(1));
		const icon = ADMONITION_ICONS[type] ?? ADMONITION_ICONS.info;
		const renderedInner = await marked(m[3].trim());

		const html = [
			`<div class="admonition admonition-${type}">`,
			`<div class="admonition-heading">`,
			`<span class="admonition-icon">${icon}</span>`,
			`<span class="admonition-title">${displayTitle}</span>`,
			`</div>`,
			`<div class="admonition-content">${renderedInner}</div>`,
			`</div>`,
		].join('');

		matches.push({ match: m[0], html });
	}

	let result = content;
	for (const { match, html } of matches) {
		result = result.replace(match, html);
	}
	return result;
}

/**
 * Process custom component tags in markdown
 * Converts custom tags like <DictionaryTable> and <DictionaryViewerFull> into placeholders that will be hydrated client-side
 * IMPORTANT: Skips content inside code blocks (```) to avoid replacing examples
 */
function processCustomComponents(content: string): string {
	// Split content by code blocks to protect them from replacement
	const codeBlockRegex = /```[\s\S]*?```/g;
	const codeBlocks: string[] = [];
	const placeholder = '___CODE_BLOCK_PLACEHOLDER___';

	// Extract and protect code blocks
	let protectedContent = content.replace(codeBlockRegex, (match) => {
		codeBlocks.push(match);
		return `${placeholder}${codeBlocks.length - 1}${placeholder}`;
	});

	// Process DictionaryTable components (table-only view)
	protectedContent = protectedContent.replace(
		/<DictionaryTable\s+url="([^"]+)"\s+showSchemaNames="([^"]+)"\s*\/?>/g,
		(_, url, showSchemaNames) => {
			// Create a marker that will be replaced client-side
			const componentId = `dictionary-table-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
			return `<div class="dictionary-table-container" data-component="DictionaryTable" data-url="${url}" data-show-schema-names="${showSchemaNames}" id="${componentId}"></div>`;
		},
	);

	// Process DictionaryViewerFull components (full viewer with header, toolbar, accordions)
	protectedContent = protectedContent.replace(
		/<DictionaryViewerFull\s+url="([^"]+)"\s*\/?>/g,
		(_, url) => {
			// Create a marker that will be replaced client-side
			const componentId = `dictionary-viewer-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
			return `<div class="dictionary-viewer-container" data-component="DictionaryViewerFull" data-url="${url}" id="${componentId}"></div>`;
		},
	);

	// Restore code blocks
	const restoredContent = protectedContent.replace(
		new RegExp(`${placeholder}(\\d+)${placeholder}`, 'g'),
		(_, index) => codeBlocks[parseInt(index)]
	);

	return restoredContent;
}