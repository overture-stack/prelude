import Lectern from '../../components/pages/swaggerDocs/Lectern';
import { createPage } from '../../global/utils/pages';

// Define your alerts, this could come from an API or be static
// const alertsJson: AlertDef[] = [
// 	{
// 		level: 'warning',
// 		title: 'Lectern API Unavailable?',
// 		message:
// 			'If you are using Prelude Phase1 the Lectern Swagger API will not work as lectern is not deployed until Phase3.',
// 		dismissable: true,
// 		id: 'lectern-api-unavailability', // Make sure each alert has a unique ID
// 	},
// ];

const LecternApiPage = createPage({
	getInitialProps: async ({ query }) => {
		return { query };
	},
	isPublic: true,
})(() => {
	return (
		<>
			{/* Add the SystemAlerts banner above your Lectern component */}
			{/* <SystemAlerts alerts={alertsJson} resetOnRefresh={false} /> */}

			{/* The actual content of the page */}
			<Lectern />
		</>
	);
});

export default LecternApiPage;
