import Score from '../../components/pages/swaggerDocs/Score';
import { createPage } from '../../global/utils/pages';

// Define your alerts, this could come from an API or be static
// const alertsJson: AlertDef[] = [
// 	{
// 		level: 'warning',
// 		title: 'Score API Unavailable?',
// 		message:
// 			'If you are using Prelude Phase1 the Score Swagger API will not work as score is not deployed until Phase3.',
// 		dismissable: true,
// 		id: 'score-api-unavailability', // Make sure each alert has a unique ID
// 	},
// ];

const ScoreApiPage = createPage({
	getInitialProps: async ({ query }) => {
		return { query };
	},
	isPublic: true,
})(() => {
	return (
		<>
			{/* Add the SystemAlerts banner above your Score component */}
			{/* <SystemAlerts alerts={alertsJson} resetOnRefresh={false} /> */}

			{/* The actual content of the page */}
			<Score />
		</>
	);
});

export default ScoreApiPage;
