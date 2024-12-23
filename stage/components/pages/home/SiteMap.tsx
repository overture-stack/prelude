/*
 *
 * Copyright (c) 2024 The Ontario Institute for Cancer Research. All rights reserved
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

import { ReactElement } from 'react';
import { css } from '@emotion/react';
import defaultTheme from '../../theme';

interface Product {
	title: string;
	link: string;
	category: string;
}

interface Category {
	title: string;
	description: string;
}

const categories: Record<string, Category> = {
	data: {
		title: 'Explore The Data',
		description: 'Two data table examples populated with mock data.',
	},
	documentation: {
		title: 'Documentation',
		description:
			'Documentation covering basic platform usage, configuration and customization, this will be expanded on in the near future.',
	},
};

const products: Product[] = [
	// Data Category
	{
		title: 'Example Composition Data',
		link: '/composition',
		category: 'data',
	},
	{
		title: 'Example Instrument Data',
		link: '/instruments',
		category: 'data',
	},
	// Documentation Category
	{
		title: 'Data submission',
		link: '/documentation',
		category: 'documentation',
	},
	{
		title: 'Configuring the data explorer',
		link: 'https://docs.overture.bio/guides/administration-guides/customizing-the-data-portal',
		category: 'documentation',
	},
];

const styles = {
	siteMap: css`
		padding: 2rem 0;
		background-color: ${defaultTheme.colors.main};
	`,
	container: css`
		width: 100%;
	`,
	categorySection: css`
		background-color: ${defaultTheme.colors.white};
		padding: 2rem;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
		margin-bottom: 2rem;
	`,
	categoryHeader: css`
		margin-bottom: 0.5rem;
		font-size: 1.5rem;
		font-weight: 700;
		color: ${defaultTheme.colors.button};
	`,
	categorySubheader: css`
		font-size: 1rem;
		opacity: 0.8;
		color: ${defaultTheme.colors.black};
		margin-bottom: 1.5rem;
	`,
	cardGrid: css`
		display: grid;
		grid-template-columns: repeat(4, 1fr); // Data category: 4 cards
		gap: 1rem;

		&[data-category='documentation'] {
			grid-template-columns: repeat(2, 1fr); // Documentation category: 2 cards
		}

		@media (max-width: 1200px) {
			grid-template-columns: repeat(2, 1fr);
			&[data-category='documentation'] {
				grid-template-columns: repeat(2, 1fr);
			}
		}

		@media (max-width: 600px) {
			grid-template-columns: 1fr;
			&[data-category='documentation'] {
				grid-template-columns: 1fr;
			}
		}
	`,
	card: css`
		display: flex;
		flex-direction: column;
		padding: 1rem;
		background-color: ${defaultTheme.colors.button};
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
		transition: transform 0.3s ease, box-shadow 0.3s ease;
		text-decoration: none;
		font-weight: 900;
		border-radius: 900px;
		color: ${defaultTheme.colors.white};

		&:hover {
			transform: translateY(-2px);
			box-shadow: 0 1px 2px rgba(0, 0, 0, 0.15);
		}
	`,
	cardTitle: css`
		font-size: 1rem;
		font-weight: 600;
		text-align: center; // Center the text
		margin: 0; // Remove any default margins
	`,
};

const Card = ({ title, link }: Product) => (
	<a href={link} css={styles.card}>
		<p css={styles.cardTitle}>{title}</p>
	</a>
);

const CategorySection = ({ category, items }: { category: string; items: Product[] }) => {
	if (!categories[category]) {
		return null;
	}

	return (
		<div css={styles.categorySection}>
			<h2 css={styles.categoryHeader}>{categories[category].title}</h2>
			<p css={styles.categorySubheader}>{categories[category].description}</p>
			<div css={styles.cardGrid} data-category={category}>
				{items.map((props, idx) => (
					<Card key={idx} {...props} />
				))}
			</div>
		</div>
	);
};

const SiteMap = (): ReactElement => {
	const categorizedProducts = products.reduce((acc, product) => {
		(acc[product.category] = acc[product.category] || []).push(product);
		return acc;
	}, {} as Record<string, Product[]>);

	return (
		<section css={styles.siteMap}>
			<div css={styles.container}>
				<CategorySection category="data" items={categorizedProducts.data || []} />
				<CategorySection category="documentation" items={categorizedProducts.documentation || []} />
			</div>
		</section>
	);
};

export default SiteMap;
