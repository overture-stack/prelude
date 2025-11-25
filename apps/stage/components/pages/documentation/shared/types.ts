/**
 * Consolidated type definitions for the documentation system
 */

export interface Section {
	title: string;
	markdownPath: string;
	content?: string;
	order: number;
	id: string;
}

export interface SidebarSection {
	title: string;
	id: string;
	order?: number;
}

export interface DocumentationPageProps {
	section: Section;
	sections: SidebarSection[];
	headings: Heading[];
}

export interface DocumentationIndexProps {
	sections: SidebarSection[];
}

export interface Heading {
	id: string;
	text: string;
	level: 1 | 2 | 3 | 4 | 5 | 6;
	sectionId?: string;
	isActive?: boolean;
}

export interface DocumentationState {
	sections: Section[];
	currentSection: Section | null;
	headings: Heading[];
	loading: boolean;
	error: string | null;
}

export interface NavigationState {
	activeHash: string;
	activeTocItem: string;
	sidebarOpen: boolean;
	tocOpen: boolean;
}

export interface DocContainerProps {
	heroHeight?: number;
}
