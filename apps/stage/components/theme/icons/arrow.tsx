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

import { css, useTheme } from '@emotion/react';

import { IconProps } from './types';

const Arrow = ({ fill, height = 19, width = 19, style }: IconProps) => {
	const theme = useTheme();
	const fillColor = fill || theme.colors.white;
	return (
		<svg
			css={css`
				${style};
				height: ${height};
				width: ${width};
			`}
			width={width}
			height={height}
			viewBox="0 0 19 19"
			fill={fillColor}
			xmlns="http://www.w3.org/2000/svg"
		>
			<path
				fillRule="evenodd"
				clipRule="evenodd"
				d="M13.0622 11.1228C13.5842 11.6435 14.4295 11.6432 14.9511 11.1228C15.4728 10.6025 15.4726 9.75914 14.9511 9.23899L10.2246 4.52436C9.87642 4.17728 9.31188 4.17747 8.96405 4.52436L4.23756 9.23899C3.71553 9.75971 3.71591 10.6027 4.23737 11.1228C4.75921 11.6432 5.60481 11.6432 6.12627 11.1228L8.27102 8.98315L8.27102 17.564C8.27102 18.2988 8.86886 18.8955 9.60647 18.8955C10.3443 18.8955 10.9421 18.2994 10.9421 17.564L10.9421 9.00742L13.0622 11.1228Z"
				fill={fillColor}
			/>
		</svg>
	);
};

export default Arrow;
