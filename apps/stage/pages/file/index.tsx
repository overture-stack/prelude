import File from '../../components/pages/file';
import { createPage } from '../../global/utils/pages';

const FilePage = createPage({
	getInitialProps: async ({ query, egoJwt }) => {
		return { query, egoJwt };
	},
	isPublic: true,
})(() => {
	return <File />;
});

export default FilePage;
