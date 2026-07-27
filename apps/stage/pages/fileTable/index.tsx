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
 * File Repository — browse all genomic files with associated clinical data.
 *
 * Backed by the file_centric Elasticsearch index via arranger-file.
 * Facets cover data type (SNV/INDEL/CNV/SV), file type, access level,
 * clinical fields (disease stage, treatment), and vital status.
 */

const {
	NEXT_PUBLIC_ARRANGER_DATATABLE_1_ADMIN_UI,
	NEXT_PUBLIC_ARRANGER_DATATABLE_1_DOCUMENT_TYPE,
	NEXT_PUBLIC_ARRANGER_DATATABLE_1_INDEX,
	NEXT_PUBLIC_ARRANGER_DATATABLE_1_MANIFEST_COLUMNS,
	NEXT_PUBLIC_DATATABLE_1_EXPORT_ROW_ID_FIELD,
	NEXT_PUBLIC_ENABLE_DATATABLE_1_QUICKSEARCH,
} = getConfig();

const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');

const manifestColumns = NEXT_PUBLIC_ARRANGER_DATATABLE_1_MANIFEST_COLUMNS.split(',')
	.filter((field) => field.trim())
	.map((fieldName) => fieldName.replace(/['"]+/g, '').trim());

const FileRepositoryPage = createPage({
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

				pageSubtitle: 'File Repository',
				callerName: 'FileRepository',

				enableQuickSearch: NEXT_PUBLIC_ENABLE_DATATABLE_1_QUICKSEARCH,

				quickSearchConfig: {
					fieldNames: ['analysis.samples.donor.submitterDonorId'],
					headerTitle: 'Donor ID',
					placeholder: 'e.g. DO001',
				},

				exportConfig: {
					fileName: `file-repository.${today}.tsv`,
					manifestColumns,
				},
			}}
		/>
	);
});

export default FileRepositoryPage;
