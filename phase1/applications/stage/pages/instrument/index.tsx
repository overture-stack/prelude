import Instrument from '../../components/pages/instrument';
import { createPage } from '../../global/utils/pages';

const InstrumentPage = createPage({
	getInitialProps: async ({ query, egoJwt }) => {
		return { query, egoJwt };
	},
	isPublic: true,
})(() => {
	return <Instrument />;
});

export default InstrumentPage;
