// pages/documentation/[...slug].tsx
import { GetStaticPaths, GetStaticProps, NextPage } from 'next';
import PageLayout from '../../components/PageLayout';
import { PageWithConfig } from '../../global/utils/pages/types';
import { DocumentationData, getDocumentationData, getAllSectionPaths } from '../../lib/documentation';
import DocumentationPage from '../../components/pages/documentation/DocumentationPage';

interface DocumentationSlugPageProps {
	documentationData: DocumentationData;
}

const DocumentationSlugPage: NextPage<DocumentationSlugPageProps> = ({ documentationData }) => {
	return (
		<PageLayout>
			<DocumentationPage {...documentationData} />
		</PageLayout>
	);
};

// Generate paths for all documentation sections
export const getStaticPaths: GetStaticPaths = async () => {
	const sectionPaths = await getAllSectionPaths();

	const paths = sectionPaths.map(({ category, id }) => ({
		params: { slug: [category, id] },
	}));

	return {
		paths,
		fallback: false,
	};
};

// Load documentation data at build time
export const getStaticProps: GetStaticProps<DocumentationSlugPageProps> = async ({ params }) => {
	const slugParts = params?.slug as string[];
	const [category, id] = slugParts ?? [];

	if (!category || !id) {
		return { notFound: true };
	}

	const documentationData = await getDocumentationData(id, category);

	if (!documentationData.currentSection) {
		return { notFound: true };
	}

	return {
		props: { documentationData },
		revalidate: 60,
	};
};

(DocumentationSlugPage as PageWithConfig).isPublic = true;

export default DocumentationSlugPage;
