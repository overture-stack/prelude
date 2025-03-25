import ProteinTable from '../../components/pages/activeDataTables/proteinTable';
import { createPage } from '../../global/utils/pages';

const DataSetFourExplorationPage = createPage({
	getInitialProps: async ({ query, egoJwt }) => {
		return { query, egoJwt };
	},
	isPublic: true,
})(() => {
	return <ProteinTable />;
});

export default DataSetFourExplorationPage;
