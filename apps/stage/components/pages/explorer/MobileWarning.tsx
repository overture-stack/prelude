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

import IconButton from '@/components/IconButton';
import { css, useTheme } from '@emotion/react';
import { useState } from 'react';
import { Dismiss as DismissIcon, Error as ErrorIcon } from '../../theme/icons';

const MobileWarning = () => {
	const theme = useTheme();
	const [showMobileWarning, setShowMobileWarning] = useState<boolean>(true);
	const hideMobileWarning = () => setShowMobileWarning(false);

	return showMobileWarning ? (
		<div
			css={css`
				background: ${theme.colors.warning_light};
				border-left: 5px solid ${theme.colors.warning_medium};
				padding: 10px 16px;
				display: flex;
				justify-content: space-between;
				align-items: start;
				position: absolute;
				top: 0;
				left: 0;
				right: 0;
				z-index: 100;
				display: none;
				@media screen and (max-width: 1024px) {
					display: flex;
				}
			`}
		>
			<div
				css={css`
					flex-shrink: 0;
				`}
			>
				<ErrorIcon width={18} fill={theme.colors.warning_dark} />
			</div>
			<div
				css={css`
					flex-grow: 1;
					padding: 0 8px;
				`}
			>
				<div
					css={css`
						font-weight: bold;
						margin-bottom: 4px;
					`}
				>
					This website may not be supported for your device.
				</div>
				<div>
					Please visit this website using a device with a wider screen for optimal experience and
					access to all features.
				</div>
			</div>
			<div
				css={css`
					margin: 0 8px 0 16px;
				`}
			>
				<IconButton
					onClick={hideMobileWarning}
					Icon={DismissIcon}
					height={12}
					width={12}
					fill={theme.colors.black}
				/>
			</div>
		</div>
	) : (
		<></>
	);
};

export default MobileWarning;
