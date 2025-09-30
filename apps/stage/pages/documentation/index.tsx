// pages/documentation/index.tsx
import { GetStaticProps } from 'next';
import PageLayout from '../../components/PageLayout';
import { PageWithConfig } from '../../global/utils/pages/types';
import { DocumentationData, getDocumentationData } from '../../lib/documentation';
import DocumentationPage from '../../components/pages/documentation/DocumentationPage';

interface DocumentationIndexProps {
	documentationData: DocumentationData;
}

const DocumentationIndex: React.FC<DocumentationIndexProps> = ({ documentationData }) => {
	return (
		<PageLayout>
			<DocumentationPage {...documentationData} />
		</PageLayout>
	);
};

// Load documentation data at build time (defaults to first section)
export const getStaticProps: GetStaticProps<DocumentationIndexProps> = async () => {
	const documentationData = await getDocumentationData(); // No slug = first section

	return {
		props: {
			documentationData,
		},
		revalidate: 60, // Revalidate every minute in production
	};
};

// Mark the page as public
(DocumentationIndex as PageWithConfig).isPublic = true;

export default DocumentationIndex;