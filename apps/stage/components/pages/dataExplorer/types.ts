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

import { CustomExporterInput } from '@overture-stack/arranger-components/dist/Table/DownloadButton/types';

/**
 * Configuration for QuickSearch functionality in the Facets sidebar.
 * QuickSearch provides autocomplete search across specified fields.
 *
 * Important: Use data field names (e.g., 'data.hugo_symbol'), NOT aggregation field names.
 */
export interface QuickSearchConfig {
	/**
	 * Field name(s) to search against - must be data fields, not aggregation fields.
	 * Examples:
	 * - Single field: 'data.hugo_symbol'
	 * - Multiple fields: ['data.hugo_symbol_a', 'data.hugo_symbol_b']
	 */
	fieldNames: string | string[];

	/**
	 * Field name to use for filtering when a value is selected.
	 * If not provided, defaults to the first field in fieldNames.
	 */
	displayFieldName?: string;

	/** Title displayed in the QuickSearch facet header */
	headerTitle: string;

	/** Placeholder text shown in the search input box */
	placeholder: string;
}

/**
 * Configuration for multiple QuickSearch instances on a single page.
 * Used when a table needs separate QuickSearch components for different fields.
 *
 * Example use cases:
 * - Correlation/Protein tables with separate searches for hugo_symbol_a and hugo_symbol_b
 */
export interface MultiQuickSearchConfig {
	/** Array of QuickSearch configurations, one for each search instance */
	configs: QuickSearchConfig[];
}

/**
 * Configuration for data export functionality.
 */
export interface ExportConfig {
	/** Default filename for exported data (without extension) */
	fileName: string;
	/** Array of custom export options (e.g., CSV, TSV, JSON) */
	customExporters?: CustomExporterInput;
	/** Columns to include in the file manifest export */
	manifestColumns?: string[];
}

/**
 * Main configuration object for a Data Explorer page.
 * This interface defines all the properties needed to create a complete
 * data exploration page with filtering, searching, and table functionality.
 */
export interface DataExplorerConfig {
	// ========== Arranger Configuration ==========
	/** URL of the Arranger API endpoint */
	arrangerApi: string;
	/** GraphQL document type name configured in Arranger */
	arrangerDocumentType: string;
	/** Elasticsearch index name */
	arrangerIndex: string;
	/** URL to the Arranger Admin UI for configuration management */
	arrangerAdminUI: string;
	/** Field name used to identify rows for export (e.g., 'submission_metadata.submitter_id') */
	exportRowIdField: string;

	// ========== Page Configuration ==========
	/** Subtitle displayed in the page header (e.g., 'Dataset 1 Data Explorer') */
	pageSubtitle: string;
	/** Unique identifier for this data explorer instance (used for debugging in Arranger) */
	callerName: string;

	// ========== Feature Flags ==========
	/** Enable/disable QuickSearch functionality in the Facets sidebar */
	enableQuickSearch?: boolean;

	// ========== Optional Configurations ==========
	/** Configuration for single QuickSearch instance (mutually exclusive with multiQuickSearchConfig) */
	quickSearchConfig?: QuickSearchConfig;
	/** Configuration for multiple QuickSearch instances (mutually exclusive with quickSearchConfig) */
	multiQuickSearchConfig?: MultiQuickSearchConfig;
	/** Configuration for data export functionality */
	exportConfig?: ExportConfig;
}
