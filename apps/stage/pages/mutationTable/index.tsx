import MutationTable from '../../components/pages/activeDataTables/mutationTable';
import { createPage } from '../../global/utils/pages';

const DataSetThreeExplorationPage = createPage({
	getInitialProps: async ({ query, egoJwt }) => {
		return { query, egoJwt };
	},
	isPublic: true,
})(() => {
	return <MutationTable />;
});

export default DataSetThreeExplorationPage;
