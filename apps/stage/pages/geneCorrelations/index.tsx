import Correlations from '../../components/pages/activeDataTables/geneCorrelations';
import { createPage } from '../../global/utils/pages';

const DataSetOneExplorationPage = createPage({
	getInitialProps: async ({ query, egoJwt }) => {
		return { query, egoJwt };
	},
	isPublic: true,
})(() => {
	return <Correlations />;
});

export default DataSetOneExplorationPage;
