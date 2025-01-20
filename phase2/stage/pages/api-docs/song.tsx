import Song from '../../components/pages/api-docs/Song';
import { createPage } from '../../global/utils/pages';

const SongSubmitPage = createPage({
  getInitialProps: async ({ query }) => {
    return { query };
  },
  isPublic: true,
})(() => {
  return (
    <Song />
  );
});

export default SongSubmitPage;