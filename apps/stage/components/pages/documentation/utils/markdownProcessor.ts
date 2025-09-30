/**
 * Unified markdown processing utilities
 * Consolidates and improves markdown rendering logic
 */

import { marked } from 'marked';
import { Heading } from '../shared/types';
import { generateId } from './documentUtils';

/**
 * Configure marked with consistent options
 */
export function configureMarked(): void {
	marked.setOptions({
		breaks: true,
		gfm: true,
	});
}

/**
 * Renders markdown safely and properly handles heading IDs
 */
export function renderMarkdown(content: string = ''): { __html: string } {
	try {
		// Ensure marked is configured
		configureMarked();

		// Process the content to add IDs to headings properly
		let processedContent = processHeadings(content);

		// Render the markdown
		let renderedHTML = marked(processedContent);

		// Wrap tables for responsive behavior
		if (typeof renderedHTML === 'string') {
			renderedHTML = wrapTables(renderedHTML);
		}

		// Handle both sync and async results from marked
		if (typeof renderedHTML === 'string') {
			// Clean up any remaining {#id} patterns that might be visible
			const cleanedHTML = renderedHTML.replace(/\s*\{#[\w-]+\}/g, '');
			return { __html: cleanedHTML };
		} else {
			// Handle promise result (shouldn't happen with sync mode, but just in case)
			console.warn('Unexpected async result from marked');
			return { __html: '<p>Loading content...</p>' };
		}
	} catch (error) {
		console.error('Error rendering markdown:', error);
		return { __html: '<p>Error rendering content</p>' };
	}
}

/**
 * Wrap tables in responsive containers
 */
function wrapTables(html: string): string {
	return html.replace(/<table([\s\S]*?)<\/table>/g, '<div class="table-container"><table$1</table></div>');
}

/**
 * Process headings to add IDs without showing {#id} in the output
 */
function processHeadings(content: string): string {
	// First remove any existing heading IDs in the format {#id}
	const cleanedContent = content.replace(/(\s*\{#[\w-]+\})/g, '');

	// Then add back IDs in a way that works with marked
	return cleanedContent.replace(/^(#{1,6})\s+(.+)$/gm, (match, hashes, title) => {
		const id = generateId(title.trim());
		return `${hashes} ${title} <span id="${id}" class="heading-anchor"></span>`;
	});
}

/**
 * Extracts headings from markdown content for table of contents
 */
export function extractHeadings(content: string): Heading[] {
	const headings: Heading[] = [];
	// Match headings without the {#id} part or with it
	const headingRegex = /^(#{1,6})\s+(.+?)(?:\s+\{#([\w-]+)\})?$/gm;

	let match;
	while ((match = headingRegex.exec(content)) !== null) {
		const level = match[1].length;
		const text = match[2].trim();
		// Use explicit ID if provided, otherwise generate one
		const explicitId = match[3];
		const id = explicitId || generateId(text);

		// Skip h1 as it's usually the title
		if (level > 1) {
			headings.push({ id, text, level: level as 1 | 2 | 3 | 4 | 5 | 6 });
		}
	}

	return headings;
}

/**
 * Validates markdown content structure
 */
export function validateMarkdownStructure(content: string): {
	isValid: boolean;
	issues: string[];
} {
	const issues: string[] = [];

	// Check for title
	if (!content.match(/^#\s+.+$/m)) {
		issues.push('Missing main title (H1)');
	}

	// Check for multiple H1s
	const h1Matches = content.match(/^#\s+.+$/gm);
	if (h1Matches && h1Matches.length > 1) {
		issues.push('Multiple H1 headings found');
	}

	// Check for proper heading hierarchy
	const headings = extractHeadings(content);
	for (let i = 1; i < headings.length; i++) {
		const current = headings[i];
		const previous = headings[i - 1];

		if (current.level > previous.level + 1) {
			issues.push(`Heading level gap: ${previous.text} (H${previous.level}) to ${current.text} (H${current.level})`);
		}
	}

	return {
		isValid: issues.length === 0,
		issues,
	};
}
