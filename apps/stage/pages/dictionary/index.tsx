import { ThemeProvider, DictionaryTableStateProvider as DictionaryStateProvider } from '@overture-stack/lectern-ui';
import { ReactElement } from 'react';
// @ts-ignore - using internal path for components not exported from main index
import { DictionaryTableViewer } from '@overture-stack/lectern-ui/dist/viewer-table/DictionaryTableViewer';
// @ts-ignore
import { HostedDictionaryDataProvider } from '@overture-stack/lectern-ui/dist/dictionary-controller/DictionaryDataContext';
import PageLayout from '../../components/PageLayout';
import { createPage } from '../../global/utils/pages';

/**
 * Dictionary Viewer - Static JSON
 * This page displays a data dictionary from a static JSON file
 */
const DictionaryPage = (): ReactElement => {
	// URL to the static dictionary JSON hosted in public directory
	const hostedDictionaryUrl = '/dictionary/dictionary.json';

	return (
		<PageLayout>
			<ThemeProvider
				theme={{
					colors: {
						accent: '#00afed',
						accent_1: '#7fc7ff',
						background_alternate: '#f5f5f5',
						background_overlay: '#333',
						background_muted: '#e0e0e0',
					},
				}}
			>
				<HostedDictionaryDataProvider hostedUrl={hostedDictionaryUrl}>
					<DictionaryStateProvider>
						<DictionaryTableViewer />
					</DictionaryStateProvider>
				</HostedDictionaryDataProvider>
			</ThemeProvider>
		</PageLayout>
	);
};

export default createPage({
	isPublic: true,
	getInitialProps: async () => null,
})(DictionaryPage);
