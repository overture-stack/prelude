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

import DataExplorerPage from '../../components/pages/dataExplorer';
import { getConfig } from '../../global/config';
import { INTERNAL_API_PROXY } from '../../global/utils/constants';
import { createPage } from '../../global/utils/pages';

/**
 * Dataset 1 Data Explorer Page
 *
 * React Learning: Clean Architecture
 * - Page routes live in pages/ directory (Next.js convention)
 * - Configuration is defined here at the route level
 * - Shared UI logic lives in components/ directory
 * - This keeps routing concerns separate from UI concerns
 */

// Get environment configuration
const {
	NEXT_PUBLIC_ARRANGER_DATATABLE_1_ADMIN_UI,
	NEXT_PUBLIC_ARRANGER_DATATABLE_1_DOCUMENT_TYPE,
	NEXT_PUBLIC_ARRANGER_DATATABLE_1_INDEX,
	NEXT_PUBLIC_DATATABLE_1_EXPORT_ROW_ID_FIELD,
	NEXT_PUBLIC_ENABLE_DATATABLE_1_QUICKSEARCH,
} = getConfig();

// Generate today's date for export filenames
const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');

/**
 * Next.js Page Component with HOC Pattern
 *
 * createPage() is a Higher-Order Component (HOC) that:
 * - Handles authentication and authorization
 * - Provides initial props from server-side
 * - Wraps our component with common functionality
 *
 * Pattern: HOC (Higher-Order Component)
 * - A function that takes a component and returns a new component
 * - Adds additional functionality without modifying original component
 * - Common pattern in React for cross-cutting concerns
 */
const DataSetOneExplorationPage = createPage({
	/**
	 * getInitialProps: Next.js server-side data fetching
	 * - Runs on the server before page renders
	 * - Can access query params and JWT token
	 * - Returns props to be passed to the component
	 */
	getInitialProps: async ({ query, egoJwt }) => {
		return { query, egoJwt };
	},
	/**
	 * isPublic: Access control flag
	 * - true = Anyone can access this page
	 * - false = Requires authentication
	 */
	isPublic: true,
})(
	/**
	 * The actual page component
	 * - Arrow function that returns JSX
	 * - Wrapped by createPage HOC above
	 */
	() => {
		return (
			<DataExplorerPage
				config={{
					// ========== Arranger Configuration ==========
					// Use the internal API proxy instead of direct Docker service URL
					// This routes through /api/dataset_1_arranger which is accessible from the browser
					arrangerApi: INTERNAL_API_PROXY.DATATABLE_1_ARRANGER,
					arrangerDocumentType: NEXT_PUBLIC_ARRANGER_DATATABLE_1_DOCUMENT_TYPE,
					arrangerIndex: NEXT_PUBLIC_ARRANGER_DATATABLE_1_INDEX,
					arrangerAdminUI: NEXT_PUBLIC_ARRANGER_DATATABLE_1_ADMIN_UI,
					exportRowIdField: NEXT_PUBLIC_DATATABLE_1_EXPORT_ROW_ID_FIELD,

					// ========== Page Configuration ==========
					pageSubtitle: 'Dataset 1 Data Explorer',
					callerName: 'DataTableOne',

					// ========== Feature Flags ==========
					enableQuickSearch: NEXT_PUBLIC_ENABLE_DATATABLE_1_QUICKSEARCH,

					// ========== QuickSearch Configuration ==========
					quickSearchConfig: {
						fieldNames: 'donors.specimens.submitter_specimen_id',
						headerTitle: 'Specimen Collector Sample ID',
						placeholder: 'e.g. AB-12345',
					},

					// ========== Export Configuration ==========
					exportConfig: {
						fileName: `dataset-1-data-export.${today}.tsv`,
						customExporters: [
							{
								label: 'Download',
								fileName: `dataset-1-data-export.${today}.tsv`,
							},
						],
					},
				}}
			/>
		);
	},
);

export default DataSetOneExplorationPage;
