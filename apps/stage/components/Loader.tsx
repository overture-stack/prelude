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
import { ReactElement } from 'react';
import Spinner from './theme/icons/spinner';

const Loader = ({
	inline = false,
	margin = 'auto',
	overlay = false,
	size = '120px',
}): ReactElement => {
	const unit = size.replace(/\d+/, '');
	const stroke = `${Number(size.match(/\d+/)?.pop()) * 0.25}${unit}`;

	return (
		<div
			css={(theme) => css`
				border: ${stroke} solid ${theme.colors.grey_3};
				border-top: ${stroke} solid ${theme.colors.secondary_dark};
				border-radius: 50%;
				display: ${inline ? 'inline-' : ''}block;
				height: ${size};
				width: ${size};
				margin: ${margin};
				animation: spin 2s linear infinite;
				z-index: 1;

				@keyframes spin {
					0% {
						transform: rotate(0deg);
					}
					100% {
						transform: rotate(360deg);
					}
				}
				${overlay &&
				`
					position: absolute;
					top: 50%;
					left: 50%;
					margin: calc(-${size} / 2) 0 0 calc(-${size} / 2);
				`}
			`}
		/>
	);
};

export const OverlayLoader = ({ minHeight }: { minHeight?: number }) => (
	<div
		css={css`
			width: 100%;
			height: 100%;
			min-height: ${minHeight || 500}px;
			display: flex;
			position: absolute;
			justify-content: center;
			padding-top: 200px;
			top: 0;
			left: 0;
			bottom: 0;
			right: 0;
			background: rgba(255, 255, 255, 0.8);
			z-index: 999;
		`}
	>
		<Spinner width={50} />
	</div>
);

export default Loader;
