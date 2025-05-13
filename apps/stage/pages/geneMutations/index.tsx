import GeneMutations from '../../components/pages/activeDataTables/geneMutations';
import { createPage } from '../../global/utils/pages';

const DataSetTwoExplorationPage = createPage({
	getInitialProps: async ({ query, egoJwt }) => {
		return { query, egoJwt };
	},
	isPublic: true,
})(() => {
	return <GeneMutations />;
});

export default DataSetTwoExplorationPage;
