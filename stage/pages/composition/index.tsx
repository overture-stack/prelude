import Correllation from '../../components/pages/composition';
import { createPage } from '../../global/utils/pages';

const CompositionPage = createPage({
	getInitialProps: async ({ query, egoJwt }) => {
		return { query, egoJwt };
	},
	isPublic: true,
})(() => {
	return <Correllation />;
});

export default CompositionPage;
