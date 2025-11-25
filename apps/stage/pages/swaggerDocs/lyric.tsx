import Lyric from '../../components/pages/swaggerDocs/Lyric';
import { createPage } from '../../global/utils/pages';

// Define your alerts, this could come from an API or be static
// const alertsJson: AlertDef[] = [
// 	{
// 		level: 'warning',
// 		title: 'Lyric API Unavailable?',
// 		message:
// 			'If you are using Prelude Phase1 the Lyric Swagger API will not work as lyric is not deployed until Phase3.',
// 		dismissable: true,
// 		id: 'lyric-api-unavailability', // Make sure each alert has a unique ID
// 	},
// ];

const LyricApiPage = createPage({
	getInitialProps: async ({ query }) => {
		return { query };
	},
	isPublic: true,
})(() => {
	return (
		<>
			{/* Add the SystemAlerts banner above your Lyric component */}
			{/* <SystemAlerts alerts={alertsJson} resetOnRefresh={false} /> */}

			{/* The actual content of the page */}
			<Lyric />
		</>
	);
});

export default LyricApiPage;
