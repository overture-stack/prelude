import ConfigGenerator from '@/components/pages/configGenerator';
import { createPage } from '../../global/utils/pages';

const ConfigGeneratorPage = createPage({
	getInitialProps: async ({ query, egoJwt }) => {
		return { query, egoJwt };
	},
	isPublic: true,
})(() => {
	return <ConfigGenerator />;
});

export default ConfigGeneratorPage;
