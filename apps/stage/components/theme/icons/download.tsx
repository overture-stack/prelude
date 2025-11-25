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

import { IconProps } from './types';

const Download = ({ fill, size = 12, style }: IconProps) => {
	return (
		<svg
			css={css`
				${style}
			`}
			height={size}
			viewBox="0 0 20 20"
			width={size}
		>
			<path
				fill={fill}
				fillRule="evenodd"
				d="M1.32 17.162h17.162c.729 0 1.32.59 1.32 1.32 0 .73-.591 1.32-1.32 1.32H1.32c-.729 0-1.32-.59-1.32-1.32 0-.73.591-1.32 1.32-1.32zm4.93-8.87l2.232 2.227V1.512c0-.774.63-1.402 1.406-1.402.777 0 1.406.628 1.406 1.402v9.032l2.257-2.252c.55-.548 1.44-.548 1.989 0 .549.547.55 1.435 0 1.983l-4.976 4.963c-.366.365-.96.365-1.327 0l-4.975-4.963c-.549-.548-.549-1.435 0-1.983.55-.548 1.439-.548 1.988 0z"
			/>
		</svg>
	);
};

export default Download;
