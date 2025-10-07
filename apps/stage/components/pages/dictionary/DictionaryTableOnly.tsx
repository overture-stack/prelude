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

import { ThemeProvider } from '@overture-stack/lectern-ui';
// @ts-ignore - using internal path for SchemaTable
import SchemaTable from '@overture-stack/lectern-ui/dist/viewer-table/DataTable/SchemaTable';
import { ReactElement } from 'react';
import { createLecternTheme } from '../../theme/adapters/lectern';
import { useDictionary, useStageTheme } from './hooks';

/**
 * Props for DictionaryTableOnly component
 */
interface DictionaryTableOnlyProps {
	/** URL to the static dictionary JSON file */
	dictionaryUrl: string;
	/** Optional: Show schema name as header above each table (default: true) */
	showSchemaNames?: boolean;
	/** Optional: CSS class for custom styling */
	className?: string;
}

/**
 * DictionaryTableOnly Component
 *
 * A simplified dictionary viewer that renders only the schema tables without:
 * - Dictionary header (name, version, description)
 * - Toolbar (expand/collapse, filters, download buttons)
 * - Accordions (tables are always visible)
 *
 * Perfect for embedding dictionary tables in documentation or when you just
 * want to display field definitions without the full viewer UI.
 *
 * @param props - Component properties
 * @returns ReactElement
 */
export const DictionaryTableOnly = ({
	dictionaryUrl,
	showSchemaNames = true,
	className,
}: DictionaryTableOnlyProps): ReactElement => {
	// Use shared hooks for dictionary loading and theme handling
	const { dictionary, loading, error } = useDictionary(dictionaryUrl);
	const stageTheme = useStageTheme();

	// Transform Stage theme to Lectern-compatible structure
	const lecternTheme = createLecternTheme(stageTheme);

	if (loading) {
		return <div className={className}>Loading dictionary...</div>;
	}

	if (error || !dictionary) {
		return <div className={className}>Error: {error || 'Dictionary not found'}</div>;
	}

	return (
		<ThemeProvider theme={lecternTheme}>
			<div className={className} style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
				{dictionary.schemas.map((schema) => (
					<div key={schema.name}>
						{showSchemaNames && (
							<h3 style={{ marginBottom: '16px', fontSize: '20px', fontWeight: 'bold' }}>
								{schema.name}
							</h3>
						)}
						<SchemaTable schema={schema} />
					</div>
				))}
			</div>
		</ThemeProvider>
	);
};
