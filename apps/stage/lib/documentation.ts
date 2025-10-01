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

			// Convert markdown to HTML with custom heading IDs
			const htmlContent = await marked(fileContent);

			// Post-process to ensure consistent IDs
			const processedHtml = htmlContent.replace(
				/<h([1-6])(?:\s+id="[^"]*")?\s*>([^<]+)<\/h[1-6]>/g,
				(match, level, text) => {
					const id = generateHeadingId(text);
					return `<h${level} id="${id}">${text}</h${level}>`;
				}
			);

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
	// Convert markdown to HTML with custom heading IDs
	const htmlContent = await marked(fileContent);

	// Post-process to ensure consistent IDs
	const processedHtml = htmlContent.replace(
		/<h([1-6])(?:\s+id="[^"]*")?\s*>([^<]+)<\/h[1-6]>/g,
		(match, level, text) => {
			const id = generateHeadingId(text);
			return `<h${level} id="${id}">${text}</h${level}>`;
		}
	);

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

		// Only include h2 headings in TOC
		if (level === 2) {
			headings.push({ id, text, level });
		}
	}

	return headings;
}