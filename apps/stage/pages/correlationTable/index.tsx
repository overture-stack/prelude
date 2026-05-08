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
 * Correlation Table Data Explorer Page
 *
 * Displays correlation data between two Hugo symbols (A and B).
 * Features multi-QuickSearch with separate autocomplete for each Hugo symbol field.
 */

const {
	NEXT_PUBLIC_ARRANGER_DATATABLE_1_ADMIN_UI,
	NEXT_PUBLIC_ARRANGER_DATATABLE_1_DOCUMENT_TYPE,
	NEXT_PUBLIC_ARRANGER_DATATABLE_1_INDEX,
	NEXT_PUBLIC_DATATABLE_1_EXPORT_ROW_ID_FIELD,
	NEXT_PUBLIC_ENABLE_DATATABLE_1_QUICKSEARCH,
} = getConfig();

const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');

const DataSetOneExplorationPage = createPage({
	getInitialProps: async ({ query, egoJwt }) => {
		return { query, egoJwt };
	},
	isPublic: true,
})(() => {
		return (
			<DataExplorerPage
				config={{
					arrangerApi: INTERNAL_API_PROXY.DATATABLE_1_ARRANGER,
					arrangerDocumentType: NEXT_PUBLIC_ARRANGER_DATATABLE_1_DOCUMENT_TYPE,
					arrangerIndex: NEXT_PUBLIC_ARRANGER_DATATABLE_1_INDEX,
					arrangerAdminUI: NEXT_PUBLIC_ARRANGER_DATATABLE_1_ADMIN_UI,
					exportRowIdField: NEXT_PUBLIC_DATATABLE_1_EXPORT_ROW_ID_FIELD,

					pageSubtitle: 'Correlation Table',
					callerName: 'CorrelationTable',

					enableQuickSearch: NEXT_PUBLIC_ENABLE_DATATABLE_1_QUICKSEARCH,

					// Multi-QuickSearch: Separate autocomplete for Hugo Symbol A and B
					multiQuickSearchConfig: {
						configs: [
							{
								fieldNames: ['data.hugo_symbol_a'],
								displayFieldName: 'data.hugo_symbol_a',
								headerTitle: 'Hugo Symbol A',
								placeholder: 'e.g. TP53',
							},
							{
								fieldNames: ['data.hugo_symbol_b'],
								displayFieldName: 'data.hugo_symbol_b',
								headerTitle: 'Hugo Symbol B',
								placeholder: 'e.g. BRCA1',
							},
						],
					},

					exportConfig: {
						fileName: `correlation-export.${today}.tsv`,
						customExporters: [
							{
								label: 'Download',
								fileName: `correlation-export.${today}.tsv`,
							},
						],
					},
				}}
			/>
		);
	},
);

export default DataSetOneExplorationPage;
