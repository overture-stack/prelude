import DataTableThree from '../../components/pages/activeDataTables/summaryTable';
import { createPage } from '../../global/utils/pages';

const DataSetThreeExplorationPage = createPage({
	getInitialProps: async ({ query, egoJwt }) => {
		return { query, egoJwt };
	},
	isPublic: true,
})(() => {
	return <DataTableThree />;
});

export default DataSetThreeExplorationPage;
