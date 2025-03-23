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

import { css, useTheme } from '@emotion/react';
import styled from '@emotion/styled';
import React from 'react';
import IconButton from './IconButton';

import DismissIcon from './theme/icons/dismiss';

type ErrorSize = 'lg' | 'md' | 'sm';

const ERROR_SIZES = {
	LG: 'lg' as ErrorSize,
	MD: 'md' as ErrorSize,
	SM: 'sm' as ErrorSize,
};

const getContainerStyles = (size: ErrorSize) =>
	({
		[ERROR_SIZES.LG]: `
      padding: 1rem 2rem;
      line-height: 24px;
    `,
		[ERROR_SIZES.MD]: `
      padding: 1rem;
      line-height: 22px;
    `,
		[ERROR_SIZES.SM]: `
      padding: 0.5rem;
      line-height: 18px;
      display: flex;
      align-items: center;
    `,
	}[size]);

const ErrorContentContainer = styled('div')<{ size: ErrorSize }>`
	${({ theme, size }) => css`
		border: 1px solid ${theme.colors.error_2};
		border-radius: 5px;
		${theme.shadow.default};
		${theme.typography.subheading};
		font-weight: normal;
		background-color: ${theme.colors.error_1};
		color: ${theme.colors.accent_dark};
		${getContainerStyles(size)};
		max-width: 600px;
	`}
`;

// Title styles
const getTitleStyle = (size: ErrorSize) =>
	({
		[ERROR_SIZES.LG]: `
      margin: 0.5rem 0 1rem;
      font-size: 18px;
      line-height: 24px;
    `,
		[ERROR_SIZES.MD]: `
      margin: 0rem;
      padding-bottom: 0.4rem;
      font-size: 16px;
      line-height: 18px;
    `,
		[ERROR_SIZES.SM]: `
      margin: 0rem,
      line-height: 16px;
    `,
	}[size]);

const ErrorTitle = styled('h1')`
	${({ size }: { size: ErrorSize }) => css`
		display: flex;
		align-items: center;
		${getTitleStyle(size)}
	`}
`;

const ErrorNotification = ({
	children,
	className,
	title,
	size,
	onDismiss,
	dismissible = false,
	...props
}: {
	children: React.ReactNode;
	className?: string;
	title?: string;
	size: ErrorSize;
	styles?: string;
	onDismiss?: Function;
	dismissible?: boolean;
}) => {
	const theme = useTheme();

	return (
		<div
			className={className}
			css={css`
				display: flex;
				flex: 1;
			`}
		>
			<ErrorContentContainer size={size}>
				{title ? (
					<div>
						<ErrorTitle size={size}>
							{title}
							{dismissible && (
								<span
									css={css`
										margin-left: 8px;
									`}
								>
									<IconButton
										onClick={(e: React.MouseEvent) => (onDismiss ? onDismiss() : () => null)}
										Icon={DismissIcon}
										height={10}
										width={10}
										fill={theme.colors.error_dark}
									/>
								</span>
							)}
						</ErrorTitle>
						{children}
					</div>
				) : (
					<div
						css={css`
							display: flex;
							flex-direction: row;
						`}
					>
						<div
							css={css`
								display: flex;
								align-items: center;
								justify-content: center;
								flex: 1;
							`}
						>
							{children}
						</div>
						{dismissible && (
							<IconButton
								onClick={(e: React.MouseEvent) => (onDismiss ? onDismiss() : () => null)}
								Icon={DismissIcon}
								height={10}
								width={10}
								fill={theme.colors.error_dark}
							/>
						)}
					</div>
				)}
			</ErrorContentContainer>
		</div>
	);
};

export default ErrorNotification;
