/**
 * Shared utilities for document processing across the documentation system
 * Consolidates duplicate logic from DocContainer, index.tsx, and [slug].tsx
 */

/**
 * Extracts the title from markdown content
 * Looks for the first H1 heading in the format "# Title"
 */
export function extractTitle(content: string): string {
	const titleMatch = content.match(/^#\s+(.+?)(?:\s+\{#.+\})?$/m);
	return titleMatch ? titleMatch[1].trim() : 'Untitled Section';
}

/**
 * Extracts the order from a filename
 * Looks for leading numbers like "01-", "02-", etc.
 */
export function extractOrder(filename: string): number {
	const match = filename.match(/^(\d+)/);
	return match ? parseInt(match[1], 10) : 999;
}

/**
 * Generates a URL-safe slug from a filename or title
 * Removes leading numbers, file extensions, and normalizes text
 */
export function generateSlug(input: string): string {
	return input
		.replace(/^\d+[-_]?/, '') // Remove leading number and optional separator
		.replace(/\.md$/, '') // Remove .md extension
		.toLowerCase()
		.replace(/\s+/g, '-') // Replace spaces with hyphens
		.replace(/[^\w-]/g, ''); // Remove non-word characters except hyphens
}

/**
 * Generates a section ID from a title for internal linking
 * Similar to generateSlug but preserves more context
 */
export function generateId(title: string): string {
	return title
		.toLowerCase()
		.replace(/\s+/g, '-')
		.replace(/[^\w-]/g, '');
}

/**
 * Extracts the first paragraph from markdown content for summaries
 * Removes title and any ID tags, then finds first paragraph
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

/**
 * Validates if a filename follows the expected documentation naming convention
 */
export function isValidDocumentationFile(filename: string): boolean {
	return filename.endsWith('.md') && /^\d+/.test(filename);
}

/**
 * Sorts documentation files by their numeric prefix
 */
export function sortDocumentationFiles(files: string[]): string[] {
	return files.sort((a, b) => extractOrder(a) - extractOrder(b));
}
