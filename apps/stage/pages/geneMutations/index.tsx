import GeneMutations from '../../components/pages/activeDataTables/geneMutations';
import { createPage } from '../../global/utils/pages';

const DataSetThreeExplorationPage = createPage({
	getInitialProps: async ({ query, egoJwt }) => {
		return { query, egoJwt };
	},
	isPublic: true,
})(() => {
	return <GeneMutations />;
});

export default DataSetThreeExplorationPage;
