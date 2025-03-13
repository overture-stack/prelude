import DataTable2 from '../../components/pages/dataTables/dataTable2';
import { createPage } from '../../global/utils/pages';

const DataSetTwoExplorationPage = createPage({
	getInitialProps: async ({ query, egoJwt }) => {
		return { query, egoJwt };
	},
	isPublic: true,
})(() => {
	return <DataTable2 />;
});

export default DataSetTwoExplorationPage;
