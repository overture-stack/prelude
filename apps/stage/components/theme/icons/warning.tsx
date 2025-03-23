/*
 *
 * Copyright (c) 2022 The Ontario Institute for Cancer Research. All rights reserved
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
import theme from '..';
import { IconProps } from './types';

const Warning = ({ height, width, style, fill = theme.colors.error_dark, size = 16 }: IconProps) => {
	// Use size if height and width are not provided
	const finalHeight = height || size;
	const finalWidth = width || size;

	return (
		<svg
			css={css`
				${style}
				height: ${finalHeight}px;
				width: ${finalWidth}px;
			`}
			width={finalWidth}
			height={finalHeight}
			viewBox="0 0 16 16"
		>
			<path
				fill={fill}
				d="M8 1.5c-.7 0-1.3.5-1.5 1.2L4.2 13.3c-.1.4.2.8.6.8h6.4c.4 0 .7-.4.6-.8L9.5 2.7c-.2-.7-.8-1.2-1.5-1.2zM8 6c.6 0 1 .4 1 1v3c0 .6-.4 1-1 1s-1-.4-1-1V7c0-.6.4-1 1-1zm0 6c.6 0 1 .4 1 1s-.4 1-1 1-1-.4-1-1 .4-1 1-1z"
			/>
		</svg>
	);
};

export default Warning;
