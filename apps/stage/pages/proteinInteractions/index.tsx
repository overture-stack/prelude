import ProteinExpression from '../../components/pages/activeDataTables/proteinInteractions';
import { createPage } from '../../global/utils/pages';

const DataSetFourExplorationPage = createPage({
	getInitialProps: async ({ query, egoJwt }) => {
		return { query, egoJwt };
	},
	isPublic: true,
})(() => {
	return <ProteinExpression />;
});

export default DataSetFourExplorationPage;
