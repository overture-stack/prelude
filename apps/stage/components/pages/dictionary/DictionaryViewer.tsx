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

import { DictionaryTableStateProvider, ThemeProvider } from '@overture-stack/lectern-ui';
// Note: DictionaryStaticDataProvider and DictionaryTableViewer are not exported from main index
// Using internal imports for static dictionary support
// @ts-ignore - using internal path
import { DictionaryTableViewer } from '@overture-stack/lectern-ui/dist/viewer-table/DictionaryTableViewer';
import { DictionaryStaticDataProvider } from '@overture-stack/lectern-ui/dist/dictionary-controller/DictionaryDataContext';
import { ReactElement } from 'react';
import { createLecternTheme } from '../../theme/adapters/lectern';
import { useDictionary, useStageTheme } from './hooks';

/**
 * Props for DictionaryViewer component
 */
interface DictionaryViewerProps {
	/** URL to the static dictionary JSON file */
	dictionaryUrl: string;
	/** Optional: CSS class for custom styling */
	className?: string;
}

/**
 * DictionaryViewer Component
 *
 * Displays a full-featured data dictionary using the Lectern UI library.
 * This component follows the same pattern as the Arranger data explorer,
 * providing a clean separation between the page and the viewer logic.
 *
 * Features:
 * - Dictionary header with name, version, and description
 * - Interactive toolbar with expand/collapse, filters, and download
 * - Collapsible accordion sections for each schema
 * - Full conditional logic and validation display
 *
 * Architecture:
 * - Fetches dictionary JSON via useDictionary hook
 * - Integrates with Stage global theme (with fallback for embedded contexts)
 * - Provides all necessary context providers for Lectern UI
 *
 * Usage:
 * - In pages: Wrapped in theme context automatically
 * - In documentation: Falls back to default theme when hydrated
 *
 * Similar to: components/pages/dataExplorer/PageContent.tsx (Arranger pattern)
 *
 * @param props - Component properties
 * @returns ReactElement
 */
export const DictionaryViewer = ({ dictionaryUrl, className }: DictionaryViewerProps): ReactElement => {
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
			<div className={className}>
				<DictionaryStaticDataProvider staticDictionaries={[dictionary]}>
					<DictionaryTableStateProvider>
						<DictionaryTableViewer />
					</DictionaryTableStateProvider>
				</DictionaryStaticDataProvider>
			</div>
		</ThemeProvider>
	);
};
