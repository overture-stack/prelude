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

import {
	DictionaryStaticDataProvider,
	DictionaryTableStateProvider,
	DictionaryTableViewer,
	LecternDataProvider,
	ThemeProvider,
} from '@overture-stack/lectern-ui';
import type { FilterDropdown } from '@overture-stack/lectern-ui/dist/viewer-table/DictionaryTableViewer';
import { css } from '@emotion/react';
import { ReactElement } from 'react';
import { createLecternTheme } from '../../theme/adapters/lectern';
import { useDictionary, useStageTheme } from './hooks';

interface DictionaryViewerProps {
	/** URL to a static dictionary JSON file — used when lecternUrl/dictionaryName are not set */
	dictionaryUrl?: string;
	/** Base URL of a live Lectern server (e.g. http://localhost:3031) */
	lecternUrl?: string;
	/** Name of the dictionary to fetch from the Lectern server */
	dictionaryName?: string;
	/** Optional: Filter dropdowns for schema-level metadata filtering */
	filterDropdowns?: FilterDropdown[];
	/** Optional: CSS class for custom styling */
	className?: string;
}

export const DictionaryViewer = ({
	dictionaryUrl,
	lecternUrl,
	dictionaryName,
	filterDropdowns,
	className,
}: DictionaryViewerProps): ReactElement => {
	const stageTheme = useStageTheme();
	const lecternTheme = createLecternTheme(stageTheme);
	const isLiveMode = !!(lecternUrl && dictionaryName);

	const { dictionary, loading, error } = useDictionary(isLiveMode ? '' : (dictionaryUrl ?? ''));

	if (!isLiveMode && loading) {
		return <div className={className}>Loading dictionary...</div>;
	}

	if (!isLiveMode && (error || !dictionary)) {
		return <div className={className}>Error: {error || 'Dictionary not found'}</div>;
	}

	const tableContent = (
		<div
			className={className}
			css={css`
				padding: 0 48px;
			`}
		>
			<DictionaryTableStateProvider>
				<DictionaryTableViewer filterDropdowns={filterDropdowns} />
			</DictionaryTableStateProvider>
		</div>
	);

	return (
		<ThemeProvider theme={lecternTheme}>
			{isLiveMode ? (
				<LecternDataProvider lecternUrl={lecternUrl!} dictionaryName={dictionaryName!}>
					{tableContent}
				</LecternDataProvider>
			) : (
				<DictionaryStaticDataProvider staticDictionaries={dictionary ? [dictionary] : []}>
					{tableContent}
				</DictionaryStaticDataProvider>
			)}
		</ThemeProvider>
	);
};
