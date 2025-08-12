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

import { ReactNode, useEffect, useState } from 'react';
import { Rnd } from 'react-rnd';
import { css, useTheme } from '@emotion/react';
import { Chevron } from '@/components/theme/icons';

const sidebarHeight = '100%';
const sidebarToggleWidth = 28;
const sidebarMinWidth = 150;

export const SidebarResizeWrapper = ({
	children,
	setSidebarWidth,
	sidebarDefaultWidth,
	sidebarVisible,
	sidebarWidth,
}: {
	children: ReactNode;
	setSidebarWidth: (width: number) => void;
	sidebarDefaultWidth: number;
	sidebarVisible: boolean;
	sidebarWidth: number;
}) => {
	const theme = useTheme();
	return (
		<Rnd
			bounds="parent"
			default={{
				x: 0,
				y: 0,
				width: sidebarDefaultWidth,
				height: sidebarHeight,
			}}
			disableDragging
			enableResizing={{
				bottom: false,
				bottomLeft: false,
				bottomRight: false,
				left: false,
				right: true,
				top: false,
				topLeft: false,
				topRight: false,
			}}
			maxWidth="50%"
			maxHeight={sidebarHeight}
			onResize={(e, direction, ref) => {
				setSidebarWidth(ref.offsetWidth);
			}}
			size={{
				width: sidebarWidth,
				height: sidebarHeight,
			}}
			style={{
				top: `-${theme.dimensions.navbar.height}px`,
				bottom: theme.dimensions.footer.height,
				boxShadow: theme.shadow.right.replace('box-shadow: ', '').replace(';', ''),
				wordWrap: 'break-word',
				display: sidebarVisible ? 'block' : 'none',
				zIndex: 4,
			}}
		>
			{children}
		</Rnd>
	);
};

export const SidebarToggle = ({
	sidebarVisible,
	toggleSidebarVisible,
}: {
	sidebarVisible: boolean;
	toggleSidebarVisible: () => void;
}) => {
	const theme = useTheme();
	return (
		<div
			css={css`
				position: absolute;
				height: calc(100% - 20px);
				top: 10px;
				bottom: 10px;
				border: 0 none;
				background: none;
				display: ${sidebarVisible ? 'none' : 'block'};
			`}
		>
			<button
				css={css`
					height: 100%;
					display: block;
					border-radius: 0 100px 100px 0;
					background: ${theme.colors.white};
					border: 2px solid ${theme.colors.grey_2};
					border-left-width: 0;
					padding: 0 5px;
					cursor: pointer;
					&:hover {
						background: ${theme.colors.grey_1};
					}
				`}
				onClick={() => {
					toggleSidebarVisible();
				}}
			>
				<Chevron
					fill={theme.colors.accent}
					style={css`
						transform: rotate(-90deg);
						margin-left: 2px;
					`}
					width={16}
					height={16}
				/>
			</button>
		</div>
	);
};

export const useResizeSidebar = () => {
	const theme = useTheme();
	const sidebarDefaultWidth = theme.dimensions.facets.width || 0;
	const [sidebarWidth, setSidebarWidth] = useState<number>(sidebarDefaultWidth);
	const [sidebarVisible, setSidebarVisible] = useState<boolean>(true);

	const toggleSidebarVisible = () => {
		// toggle visibility with CSS display block/none
		// rather than a JSX ternary statement
		// in order to maintain the state of the facet panel
		setSidebarVisible(!sidebarVisible);
		setSidebarWidth(sidebarDefaultWidth);
	};

	const contentOffset = sidebarVisible ? sidebarWidth : sidebarToggleWidth;

	useEffect(() => {
		// when the sidebar is resized to smaller than sidebarMinWidth,
		// collapse the sidebar
		if (sidebarWidth < sidebarMinWidth) {
			setSidebarVisible(false);
		}
	}, [sidebarWidth]);

	return {
		contentOffset,
		setSidebarVisible,
		setSidebarWidth,
		sidebarDefaultWidth,
		sidebarVisible,
		sidebarWidth,
		toggleSidebarVisible,
	};
};
