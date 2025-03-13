// pages/documentation/[slug].tsx
import fs from 'fs';
import { marked } from 'marked';
import { GetStaticPaths, GetStaticProps, NextPage } from 'next';
import { useRouter } from 'next/router';
import path from 'path';
import HeroBanner from '../../components/HeroBanner';
import PageLayout from '../../components/PageLayout';
import Sidebar from '../../components/pages/documentation/DocContainer/Sidebar';
import styles from '../../components/pages/documentation/DocContainer/styles';
import { Section, SidebarSection } from '../../components/pages/documentation/DocContainer/types';
import { extractHeadings, renderMarkdown } from '../../components/pages/documentation/DocContainer/utils/markdown';
import { PageWithConfig } from '../../global/utils/pages/types';

interface DocumentationPageProps {
	section: Section;
	sections: SidebarSection[];
	headings: { id: string; text: string; level: number }[];
}

const DocumentationPage: NextPage<DocumentationPageProps> = ({ section, sections, headings }) => {
	const router = useRouter();

	return (
		<PageLayout>
			<main>
				<HeroBanner
					title={section.title}
					description=""
					breadcrumbs={[
						{ label: 'Home', href: '/' },
						{ label: 'Documentation & Guides', href: '/documentation' },
						{ label: section.title },
					]}
					fixed={true}
				/>
				<div css={styles.contentWrapper}>
					<Sidebar sections={sections} />
					<main css={styles.main}>
						<article css={styles.content} id={section.id}>
							<div dangerouslySetInnerHTML={renderMarkdown(section.content || '', marked)} />

							{/* Navigation between sections */}
							<div css={styles.docFooter}>
								{sections.map((s, index) => {
									if (s.id === section.id) {
										return (
											<div key={s.id} css={styles.sectionNav}>
												<div className="prev-link">
													{index > 0 && (
														<a href={`/documentation/${sections[index - 1].id}`}>
															<svg
																xmlns="http://www.w3.org/2000/svg"
																viewBox="0 0 24 24"
																fill="none"
																stroke="currentColor"
																strokeWidth="2"
																strokeLinecap="round"
																strokeLinejoin="round"
															>
																<line x1="19" y1="12" x2="5" y2="12"></line>
																<polyline points="12 19 5 12 12 5"></polyline>
															</svg>
															Previous: {sections[index - 1].title}
														</a>
													)}
												</div>
												<div className="next-link">
													{index < sections.length - 1 && (
														<a href={`/documentation/${sections[index + 1].id}`}>
															Next: {sections[index + 1].title}
															<svg
																xmlns="http://www.w3.org/2000/svg"
																viewBox="0 0 24 24"
																fill="none"
																stroke="currentColor"
																strokeWidth="2"
																strokeLinecap="round"
																strokeLinejoin="round"
															>
																<line x1="5" y1="12" x2="19" y2="12"></line>
																<polyline points="12 5 19 12 12 19"></polyline>
															</svg>
														</a>
													)}
												</div>
											</div>
										);
									}
									return null;
								})}
							</div>
						</article>
					</main>

					{/* Table of Contents for this section */}
					{headings.length > 0 && (
						<div css={styles.toc}>
							<h4>On This Page</h4>
							<ul>
								{headings.map((heading) => (
									<li
										key={heading.id}
										style={{
											paddingLeft: `${heading.level * 0.5}rem`,
											marginLeft: `${(heading.level - 1) * 0.5}rem`,
										}}
									>
										<a href={`#${heading.id}`}>{heading.text}</a>
									</li>
								))}
							</ul>
						</div>
					)}
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

		// Extract headings for the table of contents
		const headings = extractHeadings(content);

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
				headings,
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
