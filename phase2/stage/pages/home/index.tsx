import Home from '../../components/pages/home';
import { createPage } from '../../global/utils/pages';

const HomePage = createPage({
	getInitialProps: async ({ query, egoJwt }) => {
		return { query, egoJwt };
	},
	isPublic: true,
})(() => {
	return <Home />;
});

export default HomePage;
