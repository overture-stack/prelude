// pages/documentation/index.tsx
import fs from 'fs';
import { GetStaticProps } from 'next';
import Link from 'next/link';
import path from 'path';
import HeroBanner from '../../components/HeroBanner';
import PageLayout from '../../components/PageLayout';
import Sidebar from '../../components/pages/documentation/DocContainer/Sidebar';
import styles from '../../components/pages/documentation/DocContainer/styles';
import { SidebarSection } from '../../components/pages/documentation/DocContainer/types';
import { PageWithConfig } from '../../global/utils/pages/types';

interface DocumentationIndexProps {
	sections: SidebarSection[];
}

const DocumentationIndex: React.FC<DocumentationIndexProps> = ({ sections }) => {
	return (
		<PageLayout>
			<main>
				<HeroBanner
					title="Documentation & Guides"
					description=""
					breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Documentation & Guides' }]}
					fixed={true}
				/>
				<div css={styles.contentWrapper}>
					<Sidebar sections={sections} />
					<main css={styles.main}>
						<article css={styles.content}>
							<h1>Prelude Documentation</h1>
							<p>
								Welcome to the Prelude documentation. Use the sidebar to navigate through different sections of our
								comprehensive guide.
							</p>
							<h2>Available Sections</h2>
							<ul>
								{sections.map((section) => (
									<li key={section.id}>
										<Link href={`/documentation/${section.id}`}>{section.title}</Link>
									</li>
								))}
							</ul>
						</article>
					</main>
				</div>
			</main>
		</PageLayout>
	);
};

export const getStaticProps: GetStaticProps = async () => {
	try {
		// Use Node.js fs to read markdown files directly
		const docsDirectory = path.join(process.cwd(), 'public', 'docs');
		const files = fs
			.readdirSync(docsDirectory)
			.filter((filename) => filename.endsWith('.md'))
			.sort();

		// Prepare sections
		const sectionsPromises = files.map(async (filename) => {
			const filePath = path.join(docsDirectory, filename);
			const content = fs.readFileSync(filePath, 'utf8');

			return {
				title: getDocumentTitle(content),
				id: createSlug(filename),
				order: getDocumentOrder(filename),
			};
		});

		const sections = await Promise.all(sectionsPromises);
		sections.sort((a, b) => a.order - b.order);

		return {
			props: {
				sections,
			},
		};
	} catch (error) {
		console.error('Error in getStaticProps:', error);
		return {
			props: {
				sections: [],
				error: 'Failed to load documentation',
			},
		};
	}
};

// Mark the page as public
(DocumentationIndex as PageWithConfig).isPublic = true;

// Utility functions
function createSlug(filename: string): string {
	return filename
		.replace(/^\d+[-_]?/, '') // Remove leading number and optional separator
		.replace(/\.md$/, '') // Remove .md extension
		.toLowerCase()
		.replace(/\s+/g, '-') // Replace spaces with hyphens
		.replace(/[^\w-]/g, ''); // Remove non-word characters
}

function getDocumentOrder(filename: string): number {
	const match = filename.match(/^(\d+)/);
	return match ? parseInt(match[1], 10) : 999;
}

function getDocumentTitle(content: string): string {
	const titleMatch = content.match(/^#\s+(.+)$/m);
	return titleMatch ? titleMatch[1].trim() : 'Untitled Section';
}

export default DocumentationIndex;
