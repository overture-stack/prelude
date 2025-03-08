/*
 *
 * Copyright (c) 2022 The Ontario Institute for Cancer Research. All rights reserved
 *
 *  This program and the accompanying materials are made available under the terms of
 *  the GNU Affero General Public License v3.0. You should have received a copy of the
 *  GNU Affero General Public License along with this program.
 *   If not, see <http://www.gnu.org/licenses/>.
 *
 *  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY
 *  EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES
 *  OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT
 *  SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT,
 *  INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED
 *  TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS;
 *  OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER
 *  IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN
 *  ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 *
 */

import fs from 'fs';
import { marked } from 'marked';
import { GetStaticPaths, GetStaticProps, NextPage } from 'next';
import path from 'path';
import PageLayout from '../../components/PageLayout';
import Sidebar from '../../components/pages/documentation/DocContainer/Sidebar';
import styles from '../../components/pages/documentation/DocContainer/styles';
import { Section, SidebarSection } from '../../components/pages/documentation/DocContainer/types';
import { renderMarkdown } from '../../components/pages/documentation/DocContainer/utils/markdown';
import HeroBanner from '../../components/pages/documentation/HeroBanner';
import { PageWithConfig } from '../../global/utils/pages/types';

interface DocumentationPageProps {
	section: Section;
	sections: SidebarSection[];
}

const DocumentationPage: NextPage<DocumentationPageProps> = ({ section, sections }) => {
	return (
		<PageLayout>
			<main>
				<HeroBanner />
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
