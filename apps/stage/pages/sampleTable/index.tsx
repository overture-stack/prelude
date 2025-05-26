import DataTableTwo from '../../components/pages/activeDataTables/sampleTable';
import { createPage } from '../../global/utils/pages';

const DataSetTwoExplorationPage = createPage({
	getInitialProps: async ({ query, egoJwt }) => {
		return { query, egoJwt };
	},
	isPublic: true,
})(() => {
	return <DataTableTwo />;
});

export default DataSetTwoExplorationPage;
