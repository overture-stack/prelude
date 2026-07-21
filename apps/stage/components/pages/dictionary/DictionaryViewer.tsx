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
import {
	DictionaryTableStateProvider,
	DictionaryTableViewer,
	HostedDictionaryDataProvider,
	ThemeProvider,
} from '@overture-stack/lectern-ui';
// FilterDropdown isn't re-exported from the top-level package barrel; use the same
// deep import path lectern-ui's own DictionaryViewerPage uses internally.
// @ts-ignore - using internal path
import type { FilterDropdown } from '@overture-stack/lectern-ui/dist/viewer-table/DictionaryTableViewer';
import { ReactElement, useEffect, useRef } from 'react';
import { StageThemeInterface } from '../../theme';
import { createLecternTheme } from '../../theme/adapters/lectern';

interface DictionaryViewerProps {
	/** URL to a static dictionary JSON file, e.g. /dictionary/drug-discovery.json */
	dictionaryUrl: string;
	/** Optional: schema-metadata filter dropdowns, e.g. { label: 'Clinical Domain', filterProperty: 'meta.category' } */
	filterDropdowns?: FilterDropdown[];
	/** Optional: CSS class for custom styling */
	className?: string;
}

/**
 * Renders a single Lectern dictionary (header, toolbar, schema tables, filters, and
 * the entity-relationship diagram) fetched from a static JSON URL. DictionaryTableViewer
 * renders its own header and computes the ER diagram automatically from the dictionary's
 * own foreignKey/uniqueKey restrictions — do not render a second DictionaryHeader here.
 * Loading/error states are handled internally by lectern-ui.
 */
export const DictionaryViewer = ({ dictionaryUrl, filterDropdowns, className }: DictionaryViewerProps): ReactElement => {
	const stageTheme = useTheme() as StageThemeInterface;
	const lecternTheme = createLecternTheme(stageTheme);
	const containerRef = useRef<HTMLDivElement>(null);

	// lectern-ui's Toolbar always renders a "Diagram View" button with no prop to omit
	// it, so it's hidden here by its (stable, user-facing) label text. MutationObserver
	// is needed because the toolbar mounts asynchronously once HostedDictionaryDataProvider
	// finishes its fetch, after this effect's initial run.
	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;

		const hideDiagramViewButton = () => {
			container.querySelectorAll('button').forEach((button) => {
				if (button.textContent?.trim() === 'Diagram View') {
					button.style.display = 'none';
				}
			});
		};

		hideDiagramViewButton();
		const observer = new MutationObserver(hideDiagramViewButton);
		observer.observe(container, { childList: true, subtree: true });
		return () => observer.disconnect();
	}, []);

	return (
		<ThemeProvider theme={lecternTheme}>
			<HostedDictionaryDataProvider hostedUrl={dictionaryUrl}>
				<DictionaryTableStateProvider>
					<div
						ref={containerRef}
						className={className}
						css={css`
							padding: 0 48px 48px;
						`}
					>
						<DictionaryTableViewer filterDropdowns={filterDropdowns} />
					</div>
				</DictionaryTableStateProvider>
			</HostedDictionaryDataProvider>
		</ThemeProvider>
	);
};
