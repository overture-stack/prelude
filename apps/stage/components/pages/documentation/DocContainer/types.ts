// types/documentation.ts
export interface Section {
	title: string;
	markdownPath: string;
	content?: string;
	order: number;
	id: string; // Make id non-optional and always a string
}

// Type for sidebar sections
export interface SidebarSection {
	title: string;
	id: string;
}
