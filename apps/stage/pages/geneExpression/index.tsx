import GeneExpression from '../../components/pages/activeDataTables/geneExpression';
import { createPage } from '../../global/utils/pages';

const DataSetTwoExplorationPage = createPage({
	getInitialProps: async ({ query, egoJwt }) => {
		return { query, egoJwt };
	},
	isPublic: true,
})(() => {
	return <GeneExpression />;
});

export default DataSetTwoExplorationPage;
