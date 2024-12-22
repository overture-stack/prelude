import Documentation from '../../components/pages/documentation';
import { createPage } from '../../global/utils/pages';

const DocumentationPage = createPage({
	getInitialProps: async ({ query, egoJwt }) => {
		return { query, egoJwt };
	},
	isPublic: true,
})(() => {
	return <Documentation />;
});

export default DocumentationPage;
