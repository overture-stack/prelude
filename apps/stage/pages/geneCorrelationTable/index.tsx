import CorrelationTable from '../../components/pages/activeDataTables/correlationTable';
import { createPage } from '../../global/utils/pages';

const DataSetOneExplorationPage = createPage({
	getInitialProps: async ({ query, egoJwt }) => {
		return { query, egoJwt };
	},
	isPublic: true,
})(() => {
	return <CorrelationTable />;
});

export default DataSetOneExplorationPage;
