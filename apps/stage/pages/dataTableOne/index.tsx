import DataTableOne from '../../components/pages/dataTables/dataTableOne';
import { createPage } from '../../global/utils/pages';

const DataSetOneExplorationPage = createPage({
	getInitialProps: async ({ query, egoJwt }) => {
		return { query, egoJwt };
	},
	isPublic: true,
})(() => {
	return <DataTableOne />;
});

export default DataSetOneExplorationPage;
