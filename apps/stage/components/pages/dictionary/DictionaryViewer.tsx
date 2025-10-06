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

import { useTheme } from '@emotion/react';
import { DictionaryTableStateProvider, ThemeProvider } from '@overture-stack/lectern-ui';
// Note: DictionaryStaticDataProvider and DictionaryTableViewer are not exported from main index
// Using internal imports for static dictionary support
// @ts-ignore - using internal path
import { DictionaryTableViewer } from '@overture-stack/lectern-ui/dist/viewer-table/DictionaryTableViewer';
// @ts-ignore - using internal path
import type { Dictionary } from '@overture-stack/lectern-dictionary';
import { DictionaryStaticDataProvider } from '@overture-stack/lectern-ui/dist/dictionary-controller/DictionaryDataContext';
import { ReactElement, useEffect, useState } from 'react';
import { StageThemeInterface } from '../../theme';
import { createLecternTheme } from '../../theme/adapters/lectern';

/**
 * Props for DictionaryViewer component
 */
interface DictionaryViewerProps {
	/** URL to the static dictionary JSON file */
	dictionaryUrl: string;
}

/**
 * DictionaryViewer Component
 *
 * Displays a data dictionary using the Lectern UI library.
 * This component follows the same pattern as the Arranger data explorer,
 * providing a clean separation between the page and the viewer logic.
 *
 * Architecture:
 * - Fetches dictionary JSON and uses DictionaryStaticDataProvider
 * - Integrates with Stage global theme via adapter
 * - Provides all necessary context providers
 *
 * Similar to: components/pages/dataExplorer/PageContent.tsx (Arranger pattern)
 *
 * @param props - Component properties
 * @returns ReactElement
 */
export const DictionaryViewer = ({ dictionaryUrl }: DictionaryViewerProps): ReactElement => {
	const [dictionary, setDictionary] = useState<Dictionary | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// Get Stage global theme from context
	const stageTheme = useTheme() as StageThemeInterface;

	// Transform Stage theme to Lectern-compatible structure
	const lecternTheme = createLecternTheme(stageTheme);

	useEffect(() => {
		const fetchDictionary = async () => {
			try {
				setLoading(true);
				const response = await fetch(dictionaryUrl);
				if (!response.ok) {
					throw new Error(`Failed to fetch dictionary: ${response.status}`);
				}
				const data = await response.json();
				setDictionary(data);
				setError(null);
			} catch (err) {
				setError(err instanceof Error ? err.message : 'Failed to load dictionary');
				setDictionary(null);
			} finally {
				setLoading(false);
			}
		};

		fetchDictionary();
	}, [dictionaryUrl]);

	if (loading) {
		return <div>Loading dictionary...</div>;
	}

	if (error || !dictionary) {
		return <div>Error: {error || 'Dictionary not found'}</div>;
	}

	return (
		<ThemeProvider theme={lecternTheme}>
			<DictionaryStaticDataProvider staticDictionaries={[dictionary]}>
				<DictionaryTableStateProvider>
					<DictionaryTableViewer />
				</DictionaryTableStateProvider>
			</DictionaryStaticDataProvider>
		</ThemeProvider>
	);
};
