import Demo from '../../components/pages/demo';
import { createPage } from '../../global/utils/pages';

const DemoPage = createPage({
	getInitialProps: async ({ query, egoJwt }) => {
		return { query, egoJwt };
	},
	isPublic: true,
})(() => {
	return <Demo />;
});

export default DemoPage;
