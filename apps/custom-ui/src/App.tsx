/** @jsxImportSource @emotion/react */
import { css, ThemeProvider } from '@emotion/react';
import { ArrangerDataProvider } from '@overture-stack/arranger-components';
import { ReactElement, useEffect, useState } from 'react';
import createArrangerFetcher from './utils/arrangerFetcher';
import defaultTheme from './theme';

import PageContent from './pages/PageContent';
import ErrorBoundary from './components/ErrorBoundary';
import Footer from './components/Footer';
import Header from './components/Header';

// Configuration from environment variables or defaults
const ARRANGER_API = import.meta.env.VITE_ARRANGER_API || 'http://localhost:5050';
const DOCUMENT_TYPE = import.meta.env.VITE_DOCUMENT_TYPE || 'file';
const INDEX_NAME = import.meta.env.VITE_INDEX_NAME || 'demo_centric';

const arrangerFetcher = createArrangerFetcher({
	ARRANGER_API,
});

const configsQuery = `
	query ($documentType: String!, $index: String!) {
		hasValidConfig (documentType: $documentType, index: $index)
	}
`;

const App = (): ReactElement => {
	const [arrangerHasConfig, setArrangerHasConfig] = useState<boolean>(false);
	const [loadingArrangerConfig, setLoadingArrangerConfig] = useState<boolean>(true);
	const documentType = DOCUMENT_TYPE;
	const index = INDEX_NAME;

	useEffect(() => {
		arrangerFetcher({
			endpoint: 'graphql/hasValidConfig',
			body: JSON.stringify({
				variables: {
					documentType,
					index,
				},
				query: configsQuery,
			}),
		})
			.then(async ({ data } = { data: null }) => {
				if (data?.hasValidConfig) {
					await setArrangerHasConfig(data.hasValidConfig);
					await new Promise((resolve) => setTimeout(resolve, 1000));
					return setLoadingArrangerConfig(false);
				}
				throw new Error('Could not validate Arranger server configuration!');
			})
			.catch(async (err) => {
				console.warn(err);
				await new Promise((resolve) => setTimeout(resolve, 1000));
				setLoadingArrangerConfig(false);
			});
	}, []);

	const ConfigError =
		index && documentType
			? !arrangerHasConfig && (
				<span>
					No active configurations for the portal were found. Please make sure the index and GraphQL document type
					specified have been created in the Arranger Admin UI.
				</span>
			)
			: null;

	return (
		<ThemeProvider theme={defaultTheme}>
			<div
				css={css`
					display: flex;
					flex-direction: column;
					min-height: 100vh;
				`}
			>
				<div
					css={css`
						position: sticky;
						top: 0;
						z-index: 2;
					`}
				>
					<Header />
				</div>
				<div
					css={css`
						flex: 1;
						background-color: #ffffff;
					`}
				>
				{loadingArrangerConfig ? (
					<div
						css={css`
						display: flex;
						flex-direction: column;
						justify-content: center;
						align-items: center;
						background-color: #f5f5f5;
						height: 100vh;
					`}
					>
						<div>Loading...</div>
					</div>
				) : ConfigError ? (
					<div
						css={css`
						display: flex;
						flex-direction: column;
						justify-content: center;
						align-items: center;
						min-height: calc(100vh - 7.5rem);
						padding: 2rem;
						width: 100%;
					`}
				>
					<div
						css={css`
							max-width: 800px;
							width: 100%;
							padding: 1.25rem;
							border: 0.0625rem solid #ccc;
							border-radius: 0.25rem;
							background-color: #fff3cd;
						`}
						>
							<h2 style={{ marginTop: 0, color: '#856404' }}>Configuration Error</h2>
							<p style={{ color: '#856404' }}>{ConfigError}</p>
						</div>
					</div>
				) : (
					<ErrorBoundary>
						<ArrangerDataProvider
							apiUrl={ARRANGER_API}
							customFetcher={arrangerFetcher}
							documentType={documentType}
							theme={{
								colors: {
									common: {
										black: '#000000',
									},
								},
								components: {
									Loader: {
										size: '20px',
									},
								},
							}}
						>
							<PageContent />
						</ArrangerDataProvider>
					</ErrorBoundary>
				)}
				</div>
				<Footer />
			</div>
		</ThemeProvider>
	);
};

export default App;
