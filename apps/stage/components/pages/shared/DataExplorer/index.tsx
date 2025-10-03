/*
 *
 * Copyright (c) 2024 The Ontario Institute for Cancer Research. All rights reserved
 *
 *  This program and the accompanying materials are made available under the terms of
 *  the GNU Affero General Public License v3.0. You should have received a copy of the
 *  GNU Affero General Public License along with this program.
 *   If not, see <http://www.gnu.org/licenses/>.
 *
 *  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY
 *  EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES
 *  OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT
 *  SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT,
 *  INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED
 *  TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS;
 *  OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER
 *  IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN
 *  ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 *
 */

import { css, useTheme } from '@emotion/react';
import { ArrangerDataProvider } from '@overture-stack/arranger-components';
import { ReactElement, useEffect, useState } from 'react';
import ErrorNotification from '@/components/ErrorNotification';
import Loader from '@/components/Loader';
import PageLayout from '@/components/PageLayout';
import sleep from '@/components/utils/sleep';
import getConfigError from './getConfigError';
import { configValidationQuery, createDataExplorerFetcher } from './helpers';
import PageContent from './PageContent';
import { DataExplorerConfig } from './types';

/**
 * Props interface for DataExplorerPage component.
 */
interface DataExplorerPageProps {
	/** Complete configuration for the data explorer */
	config: DataExplorerConfig;
}

/**
 * DataExplorerPage Component
 *
 * THE MAIN COMPONENT - This is the top-level component that orchestrates everything!
 *
 * What this component does:
 * 1. Validates that Arranger is properly configured
 * 2. Shows loading state while checking
 * 3. Shows error if configuration is invalid
 * 4. Renders the full data explorer if everything is good
 *
 * Component States (State Machine):
 * - Loading → Validating configuration
 * - Error → Configuration invalid
 * - Success → Show data explorer
 *
 * Advanced React Patterns:
 * 1. Conditional rendering (loading/error/success states)
 * 2. Data fetching with useEffect
 * 3. Context Provider (ArrangerDataProvider)
 * 4. Async/await pattern
 *
 * @param props - Component properties
 * @returns ReactElement
 */
const DataExplorerPage = ({ config }: DataExplorerPageProps): ReactElement => {
	const theme = useTheme();

	/**
	 * State: Track whether Arranger configuration is valid.
	 *
	 * Why boolean?
	 * - false = not configured or invalid
	 * - true = properly configured
	 */
	const [arrangerHasConfig, setArrangerHasConfig] = useState<boolean>(false);

	/**
	 * State: Track whether we're still checking configuration.
	 *
	 * Loading states are crucial for good UX:
	 * - Prevents showing errors too quickly
	 * - Lets users know something is happening
	 * - Prevents "flash of error" before data loads
	 */
	const [loadingArrangerConfig, setLoadingArrangerConfig] = useState<boolean>(true);

	/**
	 * Create a custom fetcher for this data explorer instance.
	 *
	 * Why create it here?
	 * - Each data explorer connects to different Arranger API
	 * - Fetcher is configured with the specific API URL from config
	 */
	const arrangerFetcher = createDataExplorerFetcher(config.arrangerApi);

	/**
	 * useEffect: Validate configuration on component mount.
	 *
	 * This is a DATA FETCHING pattern - very common in React!
	 *
	 * Flow:
	 * 1. Component mounts
	 * 2. useEffect runs
	 * 3. Make API call to check configuration
	 * 4. Update state based on response
	 * 5. Component re-renders with new state
	 *
	 * Empty dependency array [] means:
	 * - Run once when component mounts
	 * - Don't run again (like componentDidMount in class components)
	 */
	useEffect(() => {
		/**
		 * Async function to validate Arranger configuration.
		 *
		 * Why async/await?
		 * - arrangerFetcher returns a Promise
		 * - await pauses execution until Promise resolves
		 * - Makes async code look synchronous (easier to read)
		 *
		 * Pattern: Promise chain
		 * .then() → runs on success
		 * .catch() → runs on error
		 */
		arrangerFetcher({
			endpoint: 'graphql/hasValidConfig',
			body: JSON.stringify({
				variables: {
					documentType: config.arrangerDocumentType,
					index: config.arrangerIndex,
				},
				query: configValidationQuery,
			}),
		})
			.then(async ({ data } = {}) => {
				/**
				 * Success case: Configuration is valid
				 *
				 * Optional chaining: data?.hasValidConfig
				 * - If data is null/undefined, returns undefined
				 * - If data exists, returns data.hasValidConfig
				 * - Prevents "Cannot read property of undefined" errors
				 */
				if (data?.hasValidConfig) {
					// Update state: configuration is valid
					await setArrangerHasConfig(data.hasValidConfig);

					/**
					 * UX Enhancement: Delay before hiding loader
					 *
					 * Why?
					 * - If we hide loader immediately, it flickers
					 * - 1 second minimum gives smooth transition
					 * - Prevents jarring UI changes
					 */
					await sleep(1000);

					// Update state: done loading
					return setLoadingArrangerConfig(false);
				}

				/**
				 * Error case: Configuration exists but is invalid
				 * Throw error to trigger .catch() block
				 */
				throw new Error(`Could not validate Arranger ${config.pageSubtitle} server configuration!`);
			})
			.catch(async (err) => {
				/**
				 * Error handling
				 *
				 * Good practice:
				 * - Log error for debugging (console.warn)
				 * - Show user-friendly message (via state)
				 * - Don't crash the app
				 */
				console.warn(err);

				// Same UX delay for error state
				await sleep(1000);

				// Update state: done loading (even though there was an error)
				setLoadingArrangerConfig(false);
			});
		/**
		 * Dependency array: Empty []
		 * - Run only once on mount
		 * - Don't re-run if config changes (would cause loops)
		 *
		 * Note: In a production app, you might want to re-validate
		 * if config changes, but that's an advanced use case.
		 */
	}, []);

	/**
	 * Generate error message based on configuration status.
	 *
	 * Pattern: Computed value
	 * - Calculate value based on current state
	 * - Not stored in state (derived from state)
	 * - Recalculated on every render (but that's ok, it's fast)
	 */
	const ConfigError = getConfigError({
		hasConfig: arrangerHasConfig,
		index: config.arrangerIndex,
		documentType: config.arrangerDocumentType,
		arrangerAdminUIUrl: config.arrangerAdminUI,
	});

	/**
	 * RENDER: Conditional rendering based on state
	 *
	 * Pattern: Render different UI based on state
	 * - Loading → Show spinner
	 * - Error → Show error message
	 * - Success → Show data explorer
	 *
	 * This is called a "State Machine" pattern
	 */
	return (
		<PageLayout subtitle={config.pageSubtitle}>
			{/**
			 * LOADING STATE
			 *
			 * Ternary operator: condition ? ifTrue : ifFalse
			 * Nested ternaries for multiple states
			 */}
			{loadingArrangerConfig ? (
				<div
					css={css`
						display: flex;
						flex-direction: column;
						justify-content: center;
						align-items: center;
						background-color: ${theme.colors.grey_2};
						height: 100vh;
					`}
				>
					<Loader />
				</div>
			) : /**
			 * ERROR STATE
			 *
			 * If not loading, check if there's an error
			 * ConfigError is falsy if no error, or a React element if error exists
			 */ ConfigError ? (
				<div
					css={css`
						display: flex;
						flex-direction: column;
						justify-content: center;
						align-items: center;
						min-height: calc(100vh - 120px);
						padding: 2rem;
						width: 100%;
					`}
				>
					<div
						css={css`
							max-width: 800px;
							width: 100%;
						`}
					>
						<ErrorNotification title={'Stage Configuration Error'} size="lg">
							{ConfigError}
						</ErrorNotification>
					</div>
				</div>
			) : (
				/**
				 * SUCCESS STATE
				 *
				 * Not loading, no error → Show the data explorer!
				 *
				 * ArrangerDataProvider:
				 * - Context Provider from Arranger library
				 * - Wraps the entire data explorer
				 * - Provides data and functionality to all child components
				 * - Child components can access filters, data, etc. without prop drilling
				 *
				 * Pattern: Provider Pattern
				 * - Common in React for sharing state/functionality
				 * - Examples: ThemeProvider, AuthProvider, DataProvider
				 */
				<ArrangerDataProvider
					apiUrl={config.arrangerApi}
					customFetcher={arrangerFetcher}
					documentType={config.arrangerDocumentType}
					theme={{
						colors: {
							common: {
								black: theme.colors.black,
							},
						},
						components: {
							Input: theme.components.Input,
							Loader: {
								Component: Loader,
								size: '20px',
							},
						},
					}}
				>
					{/**
					 * PageContent Component
					 * - Contains the actual data explorer UI
					 * - Facets, QueryBar, Table
					 * - Has access to ArrangerDataProvider context
					 */}
					<PageContent config={config} />
				</ArrangerDataProvider>
			)}
		</PageLayout>
	);
};

/**
 * Export as default
 *
 * Allows importing like:
 * import DataExplorerPage from './DataExplorer'
 */
export default DataExplorerPage;
