/*
 *
 * Copyright (c) 2021 The Ontario Institute for Cancer Research. All rights reserved
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

import { css } from '@emotion/react';
import { useMemo } from 'react';

import ScrollToTop from '@/components/ScrollToTop';

import { getConfig } from '../../../global/config';
import Facets from './Facets';
import MobileWarning from './MobileWarning';
import QueryBar from './QueryBar';
import RepositoryContent from './RepositoryContent';
import { SidebarResizeWrapper, SidebarToggle, useResizeSidebar } from './ResizeSidebar';
import { VisualizationFocusContextProvider } from './VisualizationFocusContext';

const PageContent = () => {
	const {
		contentOffset,
		setSidebarVisible,
		setSidebarWidth,
		sidebarDefaultWidth,
		sidebarVisible,
		sidebarWidth,
		toggleSidebarVisible,
	} = useResizeSidebar();

	const { NEXT_PUBLIC_SHOW_MOBILE_WARNING } = getConfig();

	return useMemo(
		() => (
			<div
				css={css`
					position: relative;
				`}
			>
				{NEXT_PUBLIC_SHOW_MOBILE_WARNING && <MobileWarning />}
				<VisualizationFocusContextProvider>
					<SidebarResizeWrapper
						setSidebarWidth={setSidebarWidth}
						sidebarDefaultWidth={sidebarDefaultWidth}
						sidebarVisible={sidebarVisible}
						sidebarWidth={sidebarWidth}
					>
						<ScrollToTop>
							<Facets hidePanel={() => setSidebarVisible(false)} />
						</ScrollToTop>
					</SidebarResizeWrapper>

					<SidebarToggle
						sidebarVisible={sidebarVisible}
						toggleSidebarVisible={toggleSidebarVisible}
					/>

					<div
						css={css`
							position: absolute;
							left: ${contentOffset}px;
							width: calc(100% - ${contentOffset}px);
							height: 100%;
							padding: 0 15px;
							box-sizing: border-box;
							overflow-x: auto;
						`}
					>
						<QueryBar />
						<RepositoryContent />
					</div>
				</VisualizationFocusContextProvider>
			</div>
		),
		[sidebarVisible, sidebarWidth],
	);
};

export default PageContent;
