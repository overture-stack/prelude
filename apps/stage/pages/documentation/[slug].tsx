// Fix for pages/documentation/[slug].tsx
import fs from 'fs';
import { marked } from 'marked';
import { GetStaticPaths, GetStaticProps, NextPage } from 'next';
import path from 'path';
import HeroBanner from '../../components/HeroBanner';
import PageLayout from '../../components/PageLayout';
import Sidebar from '../../components/pages/documentation/DocContainer/Sidebar';
import styles from '../../components/pages/documentation/DocContainer/styles';
import { Section, SidebarSection } from '../../components/pages/documentation/DocContainer/types';
import { renderMarkdown } from '../../components/pages/documentation/DocContainer/utils/markdown';
import { PageWithConfig } from '../../global/utils/pages/types';

interface DocumentationPageProps {
	section: Section;
	sections: SidebarSection[];
}

const DocumentationPage: NextPage<DocumentationPageProps> = ({ section, sections }) => {
	return (
		<PageLayout>
			<main>
				<HeroBanner
					title="Documentation"
					description="Learn how to use Prelude to incrementally build your data platform"
					breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Documentation' }]}
				/>
				<div css={styles.contentWrapper}>
					<Sidebar sections={sections} />
					<main css={styles.main}>
						<article css={styles.content} id={section.id}>
							<div dangerouslySetInnerHTML={renderMarkdown(section.content || '', marked)} />
						</article>
					</main>
				</div>
			</main>
		</PageLayout>
	);
};

export const getStaticPaths: GetStaticPaths = async () => {
	// Read markdown files
	const docsDirectory = path.join(process.cwd(), 'public', 'docs');
	const files = fs
		.readdirSync(docsDirectory)
		.filter((filename) => filename.endsWith('.md'))
		.sort();

	const paths = files.map((filename) => ({
		params: { slug: createSlug(filename) },
	}));

	return {
		paths,
		fallback: false,
	};
};

export const getStaticProps: GetStaticProps = async ({ params }) => {
	const slug = params?.slug as string;

	try {
		// Read all markdown files
		const docsDirectory = path.join(process.cwd(), 'public', 'docs');
		const files = fs
			.readdirSync(docsDirectory)
			.filter((filename) => filename.endsWith('.md'))
			.sort();

		// Find the matching file
		const matchingFile = files.find((filename) => createSlug(filename) === slug);

		if (!matchingFile) {
			return { notFound: true };
		}

		// Read the content of the matching file
		const filePath = path.join(docsDirectory, matchingFile);
		const content = fs.readFileSync(filePath, 'utf8');

		// Prepare section data
		const section: Section = {
			title: getDocumentTitle(content),
			markdownPath: `/docs/${matchingFile}`,
			content,
			order: getDocumentOrder(matchingFile),
			id: createSlug(matchingFile),
		};

		// Prepare all sections for sidebar navigation
		const sectionsPromises = files.map(async (filename) => {
			const sectionPath = path.join(docsDirectory, filename);
			const sectionContent = fs.readFileSync(sectionPath, 'utf8');
			return {
				title: getDocumentTitle(sectionContent),
				id: createSlug(filename),
			};
		});

		const sections = await Promise.all(sectionsPromises);

		return {
			props: {
				section,
				sections,
			},
		};
	} catch (error) {
		console.error('Error in getStaticProps:', error);
		return { notFound: true };
	}
};

// Mark the page as public
(DocumentationPage as PageWithConfig).isPublic = true;

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

export default DocumentationPage;
