/**
 * Extracts the title from markdown content
 */
export function extractTitle(content: string): string {
	const titleMatch = content.match(/^#\s+(.+)$/m);
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
 * Renders markdown safely
 */
export function renderMarkdown(content: string = '', marked: any): { __html: string } {
	try {
		return { __html: marked(content) };
	} catch (error) {
		console.error('Error rendering markdown:', error);
		return { __html: '<p>Error rendering content</p>' };
	}
}
