/*
 *
 * Copyright (c) 2022 The Ontario Institute for Cancer Research. All rights reserved
 *
 * This program and the accompanying materials are made available under the terms of
 * the GNU Affero General Public License v3.0. You should have received a copy of the
 * GNU Affero General Public License along with this program.
 *  If not, see <http://www.gnu.org/licenses/>.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES
 * OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT
 * SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT,
 * INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED
 * TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS;
 * OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER
 * IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN
 * ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 *
 */

import { css } from '@emotion/react';
import React, { ReactElement } from 'react';
import defaultTheme from '../theme';
import DismissIcon from '../theme/icons/dismiss';
import Error from '../theme/icons/error';
import Info from '../theme/icons/info';

export type AlertLevel = 'error' | 'warning' | 'info';

export type AlertDef = {
	level: AlertLevel;
	title: string;
	message?: string;
	dismissable: boolean;
	id: string;
};

export const isAlertLevel = (level: any): level is AlertLevel => {
	return level === 'error' || level === 'warning' || level === 'info';
};

export const isAlertDef = (obj: any): obj is AlertDef => {
	return obj?.id && obj?.title && obj?.dismissable !== undefined && isAlertLevel(obj?.level);
};

export const isAlertDefs = (obj: any): obj is AlertDef[] => {
	return Array.isArray(obj) && obj.every(isAlertDef);
};

type AlertVariant = {
	backgroundColor: string;
	icon: ReactElement;
	textColor: string;
};

type SystemAlertProps = {
	alert: AlertDef;
	onClose: () => void;
};

const ALERT_VARIANTS: Record<AlertLevel, AlertVariant> = {
	error: {
		backgroundColor: defaultTheme.colors.error_1,
		icon: <Error size={40} />,
		textColor: defaultTheme.colors.black,
	},
	warning: {
		backgroundColor: defaultTheme.colors.warning_1,
		icon: <Error size={40} fill={defaultTheme.colors.warning_dark} />,
		textColor: defaultTheme.colors.black,
	},
	info: {
		backgroundColor: defaultTheme.colors.secondary_2,
		icon: <Info size={40} fill={defaultTheme.colors.secondary_dark} />,
		textColor: defaultTheme.colors.black,
	},
};

export const SystemAlert: React.FC<SystemAlertProps> = ({ alert, onClose }) => {
	function createMarkup(msg: string) {
		return { __html: msg };
	}

	const { backgroundColor, textColor, icon } = ALERT_VARIANTS[alert.level];

	return (
		<div
			css={css`
				padding: 12px;
				display: flex;
				justify-content: space-between;
				align-items: flex-start;
				background-color: ${backgroundColor};
				width: 100%;
				z-index: 1000;
			`}
		>
			<div
				css={css`
					display: flex;
					flex: 1;
				`}
			>
				<div
					css={css`
						margin: auto 15px auto auto;
						padding: 10px;
					`}
				>
					{icon}
				</div>
				<div
					css={css`
						flex: 1;
					`}
				>
					<div
						css={css`
							color: ${textColor};
							margin-top: ${alert.message ? '0px' : '6px'};
							${defaultTheme.typography.heading}
						`}
					>
						{alert.title}
					</div>
					{alert.message && (
						<div
							css={css`
								color: ${textColor};
								margin-bottom: 5px;
								${defaultTheme.typography.regular};
							`}
							dangerouslySetInnerHTML={createMarkup(alert.message)}
						></div>
					)}
				</div>
			</div>

			{alert.dismissable && (
				<div
					css={css`
						cursor: pointer;
						margin: 20px;
						display: flex;
						align-items: center;
					`}
					onClick={onClose}
					role="button"
					aria-label="Dismiss alert"
				>
					<DismissIcon height={15} width={15} fill={defaultTheme.colors.black} />
				</div>
			)}
		</div>
	);
};
