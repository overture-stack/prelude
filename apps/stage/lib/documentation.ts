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
	category: string;
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
	categoryLabels: Record<string, string>;
}

// ─── Config types ────────────────────────────────────────────────────────────

interface DocsConfigCategory {
	id: string;
	label: string;
}

interface DocsConfig {
	categories: DocsConfigCategory[];
}

function loadDocsConfig(docsDirectory: string): DocsConfig | null {
	const configPath = path.join(docsDirectory, 'docs.config.json');
	if (!fs.existsSync(configPath)) return null;
	try {
		return JSON.parse(fs.readFileSync(configPath, 'utf8')) as DocsConfig;
	} catch (e) {
		console.warn('Failed to parse docs.config.json:', e);
		return null;
	}
}

// ─── HTML processing helpers ─────────────────────────────────────────────────

async function buildHtmlContent(fileContent: string): Promise<string> {
	const withAdmonitions = await processAdmonitions(fileContent);
	const processedContent = processCustomComponents(withAdmonitions);
	const htmlContent = await marked(processedContent);

	return htmlContent
		.replace(
			/<h([1-6])(?:\s+id="[^"]*")?\s*>([^<]+)<\/h[1-6]>/g,
			(_match, level, text) => {
				const id = generateHeadingId(text);
				return `<h${level} id="${id}">${text}</h${level}>`;
			},
		)
		.replace(/(<img\s[^>]*src=")(?!\/|https?:\/\/)([^"]+)"/g, '$1/docs/$2"')
		.replace(/<summary>([\s\S]*?)<\/summary>/g, (_m, content) => {
			let c = content.replace(/<strong>([\s\S]*?)<\/strong>/g, '$1');
			c = c
				.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
				.replace(/`([^`\n]+)`/g, '<code>$1</code>')
				.replace(/\*([^*\n]+)\*/g, '<em>$1</em>');
			return `<summary>${c}</summary>`;
		});
}

// ─── Category helpers ─────────────────────────────────────────────────────────

/**
 * Returns category folder names in config order, or sorted alphabetically if no config.
 */
function getCategoryOrder(docsDirectory: string, config: DocsConfig | null): string[] {
	if (config) return config.categories.map(c => c.id).filter(id => {
		return fs.existsSync(path.join(docsDirectory, id));
	});

	const entries = fs.readdirSync(docsDirectory, { withFileTypes: true });
	return entries
		.filter(e => e.isDirectory() && e.name !== 'img')
		.map(e => e.name)
		.sort();
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Load all documentation sections at build time
 */
export async function loadDocumentationSections(): Promise<DocumentationSection[]> {
	const docsDirectory = path.join(process.cwd(), 'public/docs');

	if (!fs.existsSync(docsDirectory)) {
		console.warn('Documentation directory not found:', docsDirectory);
		return [];
	}

	const config = loadDocsConfig(docsDirectory);
	const categories = getCategoryOrder(docsDirectory, config);
	const allSections: DocumentationSection[] = [];

	for (const category of categories) {
		const categoryDir = path.join(docsDirectory, category);
		const fileNames = fs.readdirSync(categoryDir)
			.filter(name => name.endsWith('.md'))
			.sort();

		const sections = await Promise.all(
			fileNames.map(async (fileName) => {
				const filePath = path.join(categoryDir, fileName);
				const fileContent = fs.readFileSync(filePath, 'utf8');
				const title = extractTitle(fileContent) || fileName.replace(/^\d+-/, '').replace(/\.md$/, '');
				const id = generateId(fileName);
				const order = extractOrder(fileName);
				const htmlContent = await buildHtmlContent(fileContent);

				return {
					id,
					title,
					content: fileContent,
					htmlContent,
					order,
					filePath: `${category}/${fileName}`,
					category,
				};
			})
		);

		allSections.push(...sections.sort((a, b) => a.order - b.order));
	}

	return allSections;
}

/**
 * Get documentation data for a specific section
 */
export async function getDocumentationData(sectionId?: string, category?: string): Promise<DocumentationData> {
	const docsDirectory = path.join(process.cwd(), 'public/docs');
	const config = loadDocsConfig(docsDirectory);

	const categoryLabels: Record<string, string> = config
		? Object.fromEntries(config.categories.map(c => [c.id, c.label]))
		: {};

	const sections = await loadDocumentationSectionsSummary();

	let currentSection: DocumentationSection | null = null;
	if (sectionId && category) {
		currentSection = await loadSingleSection(sectionId, category);
	}

	if (!currentSection && sections.length > 0) {
		const first = sections[0];
		currentSection = await loadSingleSection(first.id, first.category);
	}

	const headings = currentSection ? extractHeadings(currentSection.content) : [];

	return {
		sections,
		currentSection,
		headings,
		categoryLabels,
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

	const config = loadDocsConfig(docsDirectory);
	const categories = getCategoryOrder(docsDirectory, config);
	const allSections: Omit<DocumentationSection, 'content' | 'htmlContent'>[] = [];

	for (const category of categories) {
		const categoryDir = path.join(docsDirectory, category);
		const fileNames = fs.readdirSync(categoryDir)
			.filter(name => name.endsWith('.md'))
			.sort();

		const sections = fileNames.map((fileName) => {
			const filePath = path.join(categoryDir, fileName);
			const fileContent = fs.readFileSync(filePath, 'utf8');
			const title = extractTitle(fileContent) || fileName.replace(/^\d+-/, '').replace(/\.md$/, '');
			const id = generateId(fileName);
			const order = extractOrder(fileName);

			return {
				id,
				title,
				order,
				filePath: `${category}/${fileName}`,
				category,
			};
		});

		allSections.push(...sections.sort((a, b) => a.order - b.order));
	}

	return allSections;
}

/**
 * Load a single section with full content
 */
export async function loadSingleSection(sectionId: string, category: string): Promise<DocumentationSection | null> {
	const docsDirectory = path.join(process.cwd(), 'public/docs');
	const categoryDir = path.join(docsDirectory, category);

	if (!fs.existsSync(categoryDir)) return null;

	// Resolve file by matching the generated ID
	const fileNames = fs.readdirSync(categoryDir).filter(name => name.endsWith('.md'));
	const fileName = fileNames.find(name => generateId(name) === sectionId);
	if (!fileName) return null;

	const filePath = path.join(categoryDir, fileName);
	const fileContent = fs.readFileSync(filePath, 'utf8');

	const title = extractTitle(fileContent) ?? fileName.replace('.md', '');

	const id = generateId(fileName);
	const order = extractOrder(fileName);
	const htmlContent = await buildHtmlContent(fileContent);

	return {
		id,
		title,
		content: fileContent,
		htmlContent,
		order,
		filePath: `${category}/${fileName}`,
		category,
	};
}

/**
 * Get all section paths for static path generation
 */
export async function getAllSectionPaths(): Promise<{ category: string; id: string }[]> {
	const sections = await loadDocumentationSectionsSummary();
	return sections.map(s => ({ category: s.category, id: s.id }));
}

// ─── Utility functions ────────────────────────────────────────────────────────

function extractTitle(content: string): string | null {
	const titleMatch = content.match(/^#\s+(.+)$/m);
	return titleMatch ? titleMatch[1].trim() : null;
}

function generateId(fileName: string): string {
	return fileName
		.replace(/^\d+-/, '')
		.replace(/\.md$/, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/(^-|-$)/g, '');
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
		const id = generateHeadingId(text);

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
 */
function processCustomComponents(content: string): string {
	const codeBlockRegex = /```[\s\S]*?```/g;
	const codeBlocks: string[] = [];
	const placeholder = '___CODE_BLOCK_PLACEHOLDER___';

	let protectedContent = content.replace(codeBlockRegex, (match) => {
		codeBlocks.push(match);
		return `${placeholder}${codeBlocks.length - 1}${placeholder}`;
	});

	protectedContent = protectedContent.replace(
		/<DictionaryTable\s+url="([^"]+)"\s+showSchemaNames="([^"]+)"\s*\/?>/g,
		(_, url, showSchemaNames) => {
			const componentId = `dictionary-table-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
			return `<div class="dictionary-table-container" data-component="DictionaryTable" data-url="${url}" data-show-schema-names="${showSchemaNames}" id="${componentId}"></div>`;
		},
	);

	protectedContent = protectedContent.replace(
		/<DictionaryViewerFull\s+url="([^"]+)"\s*\/?>/g,
		(_, url) => {
			const componentId = `dictionary-viewer-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
			return `<div class="dictionary-viewer-container" data-component="DictionaryViewerFull" data-url="${url}" id="${componentId}"></div>`;
		},
	);

	const restoredContent = protectedContent.replace(
		new RegExp(`${placeholder}(\\d+)${placeholder}`, 'g'),
		(_, index) => codeBlocks[parseInt(index)]
	);

	return restoredContent;
}
