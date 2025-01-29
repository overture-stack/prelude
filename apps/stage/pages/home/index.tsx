import SystemAlerts from '@/components/SystemAlerts';
import Home from '../../components/pages/home';
import { createPage } from '../../global/utils/pages';

const HomePage = createPage({
	getInitialProps: async ({ query, egoJwt }) => {
		return { query, egoJwt };
	},
	isPublic: true,
})(() => {
	return (
		<>
			<SystemAlerts />
			<Home />
		</>
	);
});

export default HomePage;
