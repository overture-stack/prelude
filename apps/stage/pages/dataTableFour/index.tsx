import DataTableFour from '../../components/pages/activeDataTables/proteinData';
import { createPage } from '../../global/utils/pages';

const DataSetFourExplorationPage = createPage({
	getInitialProps: async ({ query, egoJwt }) => {
		return { query, egoJwt };
	},
	isPublic: true,
})(() => {
	return <DataTableFour />;
});

export default DataSetFourExplorationPage;
