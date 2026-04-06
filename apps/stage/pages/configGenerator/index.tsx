import ConfigGenerator from '@/components/pages/configGenerator';
import { createPage } from '@/global/utils/pages';

const ConfigGeneratorPage = createPage({
	getInitialProps: async ({ query, egoJwt }) => ({ query, egoJwt }),
	isPublic: true,
})(() => <ConfigGenerator />);

export default ConfigGeneratorPage;
