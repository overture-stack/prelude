import File from '../../components/pages/dataTables/molecular';
import { createPage } from '../../global/utils/pages';

const MolecularExplorationPage = createPage({
	getInitialProps: async ({ query, egoJwt }) => {
		return { query, egoJwt };
	},
	isPublic: true,
})(() => {
	return <File />;
});

export default MolecularExplorationPage;
