import Login from '../../components/pages/login';
import { createPage } from '../../global/utils/pages';

const LoginPage = createPage({
	getInitialProps: async () => {},
	isPublic: true,
})(() => {
	return <Login />;
});

export default LoginPage;
