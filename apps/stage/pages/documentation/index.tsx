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
import { GetStaticProps } from 'next';
import Link from 'next/link';
import path from 'path';
import PageLayout from '../../components/PageLayout';
import Sidebar from '../../components/pages/documentation/DocContainer/Sidebar';
import styles from '../../components/pages/documentation/DocContainer/styles';
import { SidebarSection } from '../../components/pages/documentation/DocContainer/types';
import HeroBanner from '../../components/pages/documentation/HeroBanner';
import { PageWithConfig } from '../../global/utils/pages/types';

interface DocumentationIndexProps {
	sections: SidebarSection[];
}

const DocumentationIndex: React.FC<DocumentationIndexProps> = ({ sections }) => {
	return (
		<PageLayout>
			<main>
				<HeroBanner />
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
