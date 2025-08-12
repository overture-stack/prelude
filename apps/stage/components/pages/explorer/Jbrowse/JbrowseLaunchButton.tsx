/*
 *
 * Copyright (c) 2023 The Ontario Institute for Cancer Research. All rights reserved
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

import { getDropdownTheme } from '@/components/theme/getDropdownTheme';
import { Spinner } from '@/components/theme/icons';
import { CustomTooltip } from '@/components/Tooltip';
import { css, useTheme } from '@emotion/react';
import { TransparentButton } from '@overture-stack/arranger-components/dist/Button';
import { MultiSelectDropDown } from '@overture-stack/arranger-components/dist/DropDown';
import { find } from 'lodash';

import {
	RepositoryTabKey,
	RepositoryTabNames,
	useRepositoryTabsContext,
} from '../RepositoryTabsContext';
import useJbrowseCompatibility from './useJbrowseCompatibility';
import { jbrowseDict, JbrowseTitle, JbrowseTitles } from './utils';

const JbrowseLaunchButton = () => {
	const theme = useTheme();
	const { handleSwitchTab, handleUpdateTab, handleOpenTab, openTabs } = useRepositoryTabsContext();
	const { jbrowseCircularError, jbrowseLinearError, jbrowseLoading } = useJbrowseCompatibility();

	const handleJbrowseSelect = (jbrowseOptionKey: RepositoryTabKey, closeDropDownFn: () => void) => {
		const alternateJbrowseTab = find(openTabs, { name: RepositoryTabNames.GENOME_VIEWER });
		if (find(openTabs, { key: jbrowseOptionKey })) {
			// if selected option has a tab open, go to that tab
			handleSwitchTab(jbrowseOptionKey);
		} else if (alternateJbrowseTab) {
			// update existing jbrowse tab if available - only 1 jbrowse tab open at a time
			handleUpdateTab(alternateJbrowseTab.key, { key: jbrowseOptionKey });
			handleSwitchTab(jbrowseOptionKey);
		} else {
			handleOpenTab({
				name: RepositoryTabNames.GENOME_VIEWER,
				key: jbrowseOptionKey,
				canClose: true,
			});
		}
		closeDropDownFn();
	};

	const dropdownTheme = getDropdownTheme(theme);

	const handleJbrowseOption = (itemLabel: JbrowseTitle, closeDropDownFn: () => void) => {
		const { tabKey } = find(jbrowseDict, { title: itemLabel }) || {};
		tabKey && handleJbrowseSelect(tabKey, closeDropDownFn);
	};

	return (
		<div
			css={css`
				.genome-viewer-dropdown * {
					// stops scrollbar on dropdown
					// positions tooltip properly
					overflow: hidden !important;
				}
			`}
		>
			<MultiSelectDropDown
				theme={{
					...dropdownTheme,
					width: '140px',
					height: '30px',
					ListWrapper: {
						...dropdownTheme.ListWrapper,
						css: css`
							left: -2px;
							right: auto;
							width: 7em;
						`,
					},
				}}
				buttonAriaLabelClosed="Open Genome Viewer menu"
				buttonAriaLabelOpen="Close Genome Viewer menu"
				className="genome-viewer-dropdown"
				itemSelectionLegend="Select one of the genome viewer options"
				items={jbrowseDict.map(({ title }) => title)}
				itemToString={(itemLabel: JbrowseTitle, closeDropDownFn: () => void) => {
					const error =
						(itemLabel === JbrowseTitles.JBROWSE_LINEAR && jbrowseLinearError) ||
						(itemLabel === JbrowseTitles.JBROWSE_LINEAR && jbrowseCircularError);
					return (
						<CustomTooltip
							css={css`
								width: 100%;
								button {
									width: 100%;
								}
							`}
							arrow
							disabled={!error}
							unmountHTMLWhenHide
							html={
								<div
									css={css`
										${theme.typography.regular};
										font-size: 12px;
									`}
								>
									{error}
								</div>
							}
							position="left"
						>
							<TransparentButton
								onClick={() => handleJbrowseOption(itemLabel, closeDropDownFn)}
								disabled={jbrowseLoading || !!error}
								css={css`
									:disabled {
										color: ${theme.colors.grey_4};
									}
								`}
							>
								{itemLabel}
							</TransparentButton>
						</CustomTooltip>
					);
				}}
			>
				<div
					css={css`
						width: 105px;
						display: flex;
						align-items: center;
						justify-content: center;
					`}
				>
					{jbrowseLoading ? (
						<Spinner fill={theme.colors.white} />
					) : (
						RepositoryTabNames.GENOME_VIEWER
					)}
				</div>
			</MultiSelectDropDown>
		</div>
	);
};

export default JbrowseLaunchButton;
