import SubmitData from '@/components/pages/submit';
import { createPage } from '@/global/utils/pages';

const SubmitDataPage = createPage({
	getInitialProps: async ({ query, egoJwt }) => ({ query, egoJwt }),
	isPublic: true,
})(() => <SubmitData />);

export default SubmitDataPage;
