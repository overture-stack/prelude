/** @jsxImportSource @emotion/react */
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
import { useMemo, useState } from 'react';
import { CustomUIThemeInterface } from '../theme';

import Facets from '../components/Facets';
import ChartsLayout from './ChartsLayout';
import QueryBar from './QueryBar';
import Stats from '../components/Stats';

const PageContent = () => {
	const theme = useTheme() as CustomUIThemeInterface;
	const [showSidebar] = useState(true);
	const sidebarWidth = showSidebar ? 300 : 0;

	return useMemo(
		() => (
			<div
				css={css`
					flex: 1;
					width: 100vw;
				`}
			>
				<div
					css={css`
						display: flex;
						flex-direction: row;
						margin-left: 0;
						height: 100vh;
						max-height: 100vh;
					`}
				>
					<aside
						css={css`
							flex: 0 0 ${sidebarWidth}px;
							flex-direction: column;
							background-color: ${theme.colors.white};
							z-index: 1;
							height: 100vh !important;
							max-height: 100vh !important;
							overflow-y: auto !important;
							overflow-x: hidden;
							border-right: 0.0625rem solid #ccc;
							display: flex;
							flex-direction: column;
						`}
					>
						<Facets />
					</aside>
					<div
						css={css`
							display: flex;
							flex-direction: column;
							width: 100%;
							height: 100vh;
							overflow-y: scroll;
							background-color: #F5F7F8;
						`}
					>
						<div
							css={css`
								flex: 8.5;
								margin: 0 0.9375rem 0 0.9375rem;
								max-width: calc(100vw - ${sidebarWidth + 10}px);
							`}
						>
							<QueryBar />
							<Stats />
							<ChartsLayout />
						</div>
					</div>
				</div>
			</div>
		),
		[sidebarWidth, theme],
	);
};

export default PageContent;

