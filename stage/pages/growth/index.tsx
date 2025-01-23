import Growth from '../../components/pages/growth';
import { createPage } from '../../global/utils/pages';

const GrowthPage = createPage({
	getInitialProps: async ({ query, egoJwt }) => {
		return { query, egoJwt };
	},
	isPublic: true,
})(() => {
	return <Growth />;
});

export default GrowthPage;
