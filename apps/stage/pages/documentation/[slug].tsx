// pages/documentation/[slug].tsx
import { GetStaticPaths, GetStaticProps, NextPage } from 'next';
import PageLayout from '../../components/PageLayout';
import { PageWithConfig } from '../../global/utils/pages/types';
import { DocumentationData, getDocumentationData, getAllSectionIds } from '../../lib/documentation';
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
	const sectionIds = await getAllSectionIds();

	const paths = sectionIds.map((id) => ({
		params: { slug: id },
	}));

	return {
		paths,
		fallback: false, // 404 for unknown paths
	};
};

// Load documentation data at build time
export const getStaticProps: GetStaticProps<DocumentationSlugPageProps> = async ({ params }) => {
	const slug = params?.slug as string;
	const documentationData = await getDocumentationData(slug);

	// If section not found, return 404
	if (!documentationData.currentSection) {
		return {
			notFound: true,
		};
	}

	return {
		props: {
			documentationData,
		},
		revalidate: 60, // Revalidate every minute in production
	};
};

// Mark the page as public
(DocumentationSlugPage as PageWithConfig).isPublic = true;

export default DocumentationSlugPage;