// DocsContainer/utils/markdown.ts

/**
 * Extracts the title from markdown content
 */
export function extractTitle(content: string): string {
	const titleMatch = content.match(/^#\s+(.+?)(?:\s+\{#.+\})?$/m);
	return titleMatch ? titleMatch[1].trim() : 'Untitled Section';
}

/**
 * Extracts the order from a filename
 */
export function extractOrder(filename: string): number {
	const match = filename.match(/^(\d+)/);
	return match ? parseInt(match[1], 10) : 999;
}

/**
 * Generates a section ID from a title
 */
export function generateId(title: string): string {
	return title
		.toLowerCase()
		.replace(/\s+/g, '-')
		.replace(/[^\w-]/g, '');
}

/**
 * Renders markdown safely and properly handles heading IDs
 */
export function renderMarkdown(content: string = '', marked: any): { __html: string } {
	try {
		// Process the content to add IDs to headings properly
		const processedContent = processHeadings(content);

		// Render the markdown
		const renderedHTML = marked(processedContent);

		// Clean up any remaining {#id} patterns that might be visible
		const cleanedHTML = renderedHTML.replace(/\s*\{#[\w-]+\}/g, '');

		return { __html: cleanedHTML };
	} catch (error) {
		console.error('Error rendering markdown:', error);
		return { __html: '<p>Error rendering content</p>' };
	}
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
export function extractHeadings(content: string): { id: string; text: string; level: number }[] {
	const headings: { id: string; text: string; level: number }[] = [];
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
			headings.push({ id, text, level });
		}
	}

	return headings;
}

/**
 * Extracts the first paragraph from markdown content for summaries
 */
export function extractSummary(content: string, maxLength: number = 160): string {
	// Remove the title and any ID tags
	const contentWithoutTitle = content.replace(/^#\s+.+?(?:\s+\{#.+\})?$/m, '').trim();

	// Find the first paragraph
	const paragraphMatch = contentWithoutTitle.match(/^(?!#)(.+?)(\n\n|$)/s);

	if (paragraphMatch) {
		const summary = paragraphMatch[1].replace(/\n/g, ' ').trim();

		// Truncate if too long
		if (summary.length > maxLength) {
			return summary.substring(0, maxLength) + '...';
		}

		return summary;
	}

	return '';
}
