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
	/**
	 * Set for categories whose content is a vendored submodule doc tree (e.g. the
	 * Arranger submodule at apps/arranger/docs, symlinked in). External trees are
	 * scanned recursively and their relative `.md` cross-links and images are
	 * rewritten to resolve inside Stage; Prelude's own flat docs are left untouched.
	 */
	external?: boolean;
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

function externalCategoryIds(config: DocsConfig | null): Set<string> {
	return new Set((config?.categories ?? []).filter((c) => c.external).map((c) => c.id));
}

// ─── Markdown source helpers ──────────────────────────────────────────────────

// Subdirectories that hold images/assets, never doc pages — skipped when scanning.
const ASSET_DIRS = new Set(['assets', 'img', 'images']);

// Order in which known subdirectories of an external tree are presented. Anything
// not listed sorts after these, alphabetically.
const EXTERNAL_DIR_ORDER = ['', 'usage', 'migration'];

function stripFrontmatter(content: string): string {
	return content.replace(/^﻿?---\r?\n[\s\S]*?\r?\n---\r?\n?/, '');
}

function frontmatterSidebarPosition(content: string): number | null {
	const fm = content.match(/^﻿?---\r?\n([\s\S]*?)\r?\n---/);
	if (!fm) return null;
	const pos = fm[1].match(/^\s*sidebar_position:\s*(\d+)\s*$/m);
	return pos ? parseInt(pos[1], 10) : null;
}

/**
 * Recursively collect `.md` files within a category directory, returning each
 * file's path relative to the category root. Asset subdirectories are skipped.
 * Non-recursive categories (Prelude's own) simply yield their top-level files.
 */
function collectMarkdownFiles(categoryDir: string): string[] {
	const out: string[] = [];
	const walk = (dir: string, prefix: string) => {
		let entries: fs.Dirent[];
		try {
			entries = fs.readdirSync(dir, { withFileTypes: true });
		} catch {
			return;
		}
		for (const entry of entries) {
			const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
			if (entry.isDirectory()) {
				if (ASSET_DIRS.has(entry.name)) continue;
				walk(path.join(dir, entry.name), rel);
			} else if (entry.name.endsWith('.md')) {
				out.push(rel);
			}
		}
	};
	walk(categoryDir, '');
	return out;
}

function dirRank(relDir: string): number {
	const i = EXTERNAL_DIR_ORDER.indexOf(relDir);
	return i === -1 ? EXTERNAL_DIR_ORDER.length : i;
}

/** Sort weight for a file within its category: subdir group, then in-file order. */
function computeOrder(relPath: string, content: string): number {
	const relDir = relPath.includes('/') ? relPath.split('/').slice(0, -1).join('/') : '';
	const fileName = relPath.split('/').pop() ?? relPath;
	const inFile = frontmatterSidebarPosition(content) ?? extractOrder(fileName);
	return dirRank(relDir) * 1000 + inFile;
}

// ─── HTML processing helpers ─────────────────────────────────────────────────

interface BuildOptions {
	/** External submodule tree: rewrite relative links/images to resolve in Stage. */
	external?: boolean;
	category?: string;
	/** Directory of the source file relative to the category root (for path resolution). */
	relDir?: string;
	/** Maps a normalized `.md` target path (relative to category root) to its Stage route id. */
	linkMap?: Map<string, string>;
}

/** Resolve a relative path against a base directory, both relative to the category root. */
function resolveWithin(relDir: string, target: string): string {
	return path.posix.normalize(path.posix.join(relDir || '.', target)).replace(/^\.\//, '');
}

/** Rewrite an external tree's relative `.md` cross-links to Stage documentation routes. */
function rewriteExternalLinks(content: string, category: string, relDir: string, linkMap: Map<string, string>): string {
	return content.replace(/\]\((\.\.?\/[^)\s]+?\.md)(#[^)\s]*)?\)/g, (match, target: string, anchor: string = '') => {
		const resolved = resolveWithin(relDir, target);
		const id = linkMap.get(resolved);
		if (!id) return match; // out-of-tree target (e.g. ../../CHANGELOG.md) — leave as-is
		return `](/documentation/${category}/${id}${anchor})`;
	});
}

async function buildHtmlContent(fileContent: string, opts: BuildOptions = {}): Promise<string> {
	let source = stripFrontmatter(fileContent);

	if (opts.external && opts.linkMap && opts.category !== undefined) {
		source = rewriteExternalLinks(source, opts.category, opts.relDir ?? '', opts.linkMap);
	}

	const withAdmonitions = await processAdmonitions(source);
	const processedContent = processCustomComponents(withAdmonitions);
	const htmlContent = await marked(processedContent);

	const withHeadings = htmlContent
		.replace(
			/<h([1-6])(?:\s+id="[^"]*")?\s*>([^<]+)<\/h[1-6]>/g,
			(_match, level, text) => {
				const id = generateHeadingId(text);
				return `<h${level} id="${id}">${text}</h${level}>`;
			},
		);

	// Image resolution differs by source: Prelude docs reference images relative to the
	// docs root (rewritten to /docs/<src>), while an external tree references them
	// relative to the source file, resolved here against the category and file directory.
	const withImages =
		opts.external && opts.category !== undefined
			? withHeadings.replace(
					/(<img\s[^>]*src=")(?!\/|https?:\/\/)([^"]+)"/g,
					(_m, pre, src) => `${pre}/docs/${opts.category}/${resolveWithin(opts.relDir ?? '', src)}"`,
			  )
			: withHeadings.replace(/(<img\s[^>]*src=")(?!\/|https?:\/\/)([^"]+)"/g, '$1/docs/$2"');

	return withImages.replace(/<summary>([\s\S]*?)<\/summary>/g, (_m, content) => {
		let c = content.replace(/<strong>([\s\S]*?)<\/strong>/g, '$1');
		c = c
			.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
			.replace(/`([^`\n]+)`/g, '<code>$1</code>')
			.replace(/\*([^*\n]+)\*/g, '<em>$1</em>');
		return `<summary>${c}</summary>`;
	});
}

/** Build the normalized-relpath → route-id map for an external category's cross-links. */
function buildLinkMap(categoryDir: string): Map<string, string> {
	const map = new Map<string, string>();
	for (const relPath of collectMarkdownFiles(categoryDir)) {
		const fileName = relPath.split('/').pop() ?? relPath;
		map.set(relPath, generateId(fileName));
	}
	return map;
}

// ─── Category helpers ─────────────────────────────────────────────────────────

/**
 * Returns category folder names in config order, or sorted alphabetically if no config.
 * A category whose directory is missing (e.g. an uninitialized submodule symlink) is skipped.
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
	const externalIds = externalCategoryIds(config);
	const allSections: DocumentationSection[] = [];

	for (const category of categories) {
		const categoryDir = path.join(docsDirectory, category);
		const isExternal = externalIds.has(category);
		const linkMap = isExternal ? buildLinkMap(categoryDir) : undefined;
		const relPaths = collectMarkdownFiles(categoryDir);

		const sections = await Promise.all(
			relPaths.map(async (relPath) => {
				const fileName = relPath.split('/').pop() ?? relPath;
				const relDir = relPath.includes('/') ? relPath.split('/').slice(0, -1).join('/') : '';
				const filePath = path.join(categoryDir, relPath);
				const fileContent = fs.readFileSync(filePath, 'utf8');
				const title = extractTitle(fileContent) || fileName.replace(/^\d+-/, '').replace(/\.md$/, '');
				const id = generateId(fileName);
				const order = computeOrder(relPath, fileContent);
				const htmlContent = await buildHtmlContent(fileContent, { external: isExternal, category, relDir, linkMap });

				return {
					id,
					title,
					content: fileContent,
					htmlContent,
					order,
					filePath: `${category}/${relPath}`,
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
		const relPaths = collectMarkdownFiles(categoryDir);

		const sections = relPaths.map((relPath) => {
			const fileName = relPath.split('/').pop() ?? relPath;
			const filePath = path.join(categoryDir, relPath);
			const fileContent = fs.readFileSync(filePath, 'utf8');
			const title = extractTitle(fileContent) || fileName.replace(/^\d+-/, '').replace(/\.md$/, '');
			const id = generateId(fileName);
			const order = computeOrder(relPath, fileContent);

			return {
				id,
				title,
				order,
				filePath: `${category}/${relPath}`,
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

	const config = loadDocsConfig(docsDirectory);
	const isExternal = externalCategoryIds(config).has(category);

	// Resolve file by matching the generated ID across the (possibly nested) tree
	const relPaths = collectMarkdownFiles(categoryDir);
	const relPath = relPaths.find((rp) => generateId(rp.split('/').pop() ?? rp) === sectionId);
	if (!relPath) return null;

	const fileName = relPath.split('/').pop() ?? relPath;
	const relDir = relPath.includes('/') ? relPath.split('/').slice(0, -1).join('/') : '';
	const filePath = path.join(categoryDir, relPath);
	const fileContent = fs.readFileSync(filePath, 'utf8');

	const title = extractTitle(fileContent) ?? fileName.replace('.md', '');
	const id = generateId(fileName);
	const order = computeOrder(relPath, fileContent);
	const linkMap = isExternal ? buildLinkMap(categoryDir) : undefined;
	const htmlContent = await buildHtmlContent(fileContent, { external: isExternal, category, relDir, linkMap });

	return {
		id,
		title,
		content: fileContent,
		htmlContent,
		order,
		filePath: `${category}/${relPath}`,
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
	const titleMatch = stripFrontmatter(content).match(/^#\s+(.+)$/m);
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
	while ((match = headingRegex.exec(stripFrontmatter(content))) !== null) {
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
	// Tolerate leading indentation on the fence (some submodule docs indent their
	// `:::` blocks); the block's own indent is stripped from the inner content so it
	// isn't misread as a code block when rendered.
	const admonitionRegex = /^([ \t]*):::(\w+)([ \t][^\n]*)?\n([\s\S]*?)^[ \t]*:::[ \t]*$/gm;
	const matches: Array<{ match: string; html: string }> = [];

	let m: RegExpExecArray | null;
	while ((m = admonitionRegex.exec(content)) !== null) {
		const indent = m[1] ?? '';
		const type = m[2].toLowerCase();
		const customTitle = m[3] ? m[3].trim() : '';
		const displayTitle = customTitle || (type.charAt(0).toUpperCase() + type.slice(1));
		const icon = ADMONITION_ICONS[type] ?? ADMONITION_ICONS.info;
		const inner = indent
			? m[4].split('\n').map((line) => (line.startsWith(indent) ? line.slice(indent.length) : line)).join('\n')
			: m[4];
		const renderedInner = await marked(inner.trim());

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
