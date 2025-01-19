import Score from '../../components/pages/api-docs/Score';
import { createPage } from '../../global/utils/pages';

const ScoreSubmitPage = createPage({
  getInitialProps: async ({ query }) => {
    return { query };
  },
  isPublic: true,
})(() => {
  return (
    <Score />
  );
});

export default ScoreSubmitPage;