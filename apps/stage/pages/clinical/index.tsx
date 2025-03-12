import Clinical from '../../components/pages/dataTables/clinical';
import { createPage } from '../../global/utils/pages';

const ClinicalExplorationPage = createPage({
	getInitialProps: async ({ query, egoJwt }) => {
		return { query, egoJwt };
	},
	isPublic: true,
})(() => {
	return <Clinical />;
});

export default ClinicalExplorationPage;
