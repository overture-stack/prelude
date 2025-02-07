import SystemAlerts from '@/components/SystemAlerts';
import Song from '../../components/pages/api-docs/Song';
import { AlertDef } from '../../global/types/types';
import { createPage } from '../../global/utils/pages';

// Define your alerts, this could come from an API or be static
const alertsJson: AlertDef[] = [
	{
		level: 'warning',
		title: 'Song API Unavailable?',
		message: 'If you are using Prelude Phase1 the Song Swagger API will not work as song is not deployed until Phase3.',
		dismissable: true,
		id: 'song-api-unavailability', // Make sure each alert has a unique ID
	},
];

const SongSubmitPage = createPage({
	getInitialProps: async ({ query }) => {
		return { query };
	},
	isPublic: true,
})(() => {
	return (
		<>
			{/* Add the SystemAlerts banner above your Song component */}
			<SystemAlerts alerts={alertsJson} resetOnRefresh={false} />

			{/* The actual content of the page */}
			<Song />
		</>
	);
});

export default SongSubmitPage;
