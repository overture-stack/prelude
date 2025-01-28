import Tabular from '../../components/pages/tabular';
import { createPage } from '../../global/utils/pages';

const TabularPage = createPage({
	getInitialProps: async ({ query, egoJwt }) => {
		return { query, egoJwt };
	},
	isPublic: true,
})(() => {
	return <Tabular />;
});

export default TabularPage;
