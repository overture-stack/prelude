import DataTable1 from '../../components/pages/dataTables/dataTable1';
import { createPage } from '../../global/utils/pages';

const DataSetOneExplorationPage = createPage({
	getInitialProps: async ({ query, egoJwt }) => {
		return { query, egoJwt };
	},
	isPublic: true,
})(() => {
	return <DataTable1 />;
});

export default DataSetOneExplorationPage;
