import MRNATable from '../../components/pages/activeDataTables/mRNATable';
import { createPage } from '../../global/utils/pages';

const DataSetTwoExplorationPage = createPage({
	getInitialProps: async ({ query, egoJwt }) => {
		return { query, egoJwt };
	},
	isPublic: true,
})(() => {
	return <MRNATable />;
});

export default DataSetTwoExplorationPage;
