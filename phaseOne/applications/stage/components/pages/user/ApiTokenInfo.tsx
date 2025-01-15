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

import { css, Global, useTheme } from '@emotion/react';
import styled from '@emotion/styled';
import { has, isEmpty, orderBy } from 'lodash';
import React, { FunctionComponent, ReactNode, useEffect, useState } from 'react';
import { Tooltip, TooltipProps } from 'react-tippy';

import { parseExpiry, getDayValue } from '../../../global/utils/apiToken';
import { getConfig } from '../../../global/config';
import useAuthContext from '../../../global/hooks/useAuthContext';
import { AUTH_PROVIDER, INTERNAL_API_PROXY } from '../../../global/utils/constants';

import Button from '../../Button';
import StyledLink from '../../Link';

import defaultTheme from '../../theme';
import { Checkmark } from '../../theme/icons';
import { AccessLevel, parseScope, ScopeObj } from '../../../global/utils/egoTokenUtils';
import ErrorNotification from '../../ErrorNotification';

import sleep from '../../utils/sleep';
import DMSAdminContact, { GenericHelpMessage } from '../../DMSAdminContact';
import { scopesFromPermissions, permissionBodyParams } from '@/global/utils/keycloakUtils';
import urlJoin from 'url-join';

interface ApiToken {
	expiryDate: string;
	isRevoked: boolean;
	issueDate: string;
	name?: string;
	scope: string[];
}

interface CustomTooltipProps extends TooltipProps {
	children: ReactNode;
}
// TODO: workaround for react-tippy 1.4.0 --- remove with upgraded fix
// related issue: https://github.com/tvkhoa/react-tippy/issues/169
const CustomTooltip: FunctionComponent<CustomTooltipProps> = (props) =>
	React.cloneElement(<Tooltip />, { ...props });

const TooltipContainer = styled('div')`
	${({ theme }) => css`
		${theme.typography.label};
		background: ${theme.colors.grey_6};
		border-radius: 2px;
		padding: 2px 4px;
		color: white;
		font-weight: normal;
		margin-bottom: 10%;
		&:before {
			content: '';
			display: block;
			position: absolute;
			width: 0;
			height: 0;
			border: 5px solid transparent;
			pointer-events: none;
			right: 50%;
			top: 79%;
			border-top-color: ${theme.colors.grey_6};
			border-right: 5px solid transparent;
			border-left: 5px solid transparent;
			margin-right: -5px;
		}
	`}
`;

enum ApiTokenErrorType {
	SCOPES_ERROR = 'scopes_error',
	GENERATE_TOKEN_ERROR = 'generate_token_error',
	REVOKE_TOKEN_ERROR = 'revoke_token_error',
	FETCH_TOKENS_ERROR = 'fetch_tokens_error',
	NO_VALID_PERMISSIONS_ERROR = 'no_valid_permissions_error',
}

type ErrorResponse = {
	type: ApiTokenErrorType;
	statusCode?: number;
};

const WithGenericHelpMessage = ({ requestError }: { requestError: string }) => {
	return (
		<span>
			{requestError}
			<GenericHelpMessage />
		</span>
	);
};

const getErrorMessage = ({ type, statusCode }: ErrorResponse) => {
	switch (type) {
		case ApiTokenErrorType.SCOPES_ERROR:
			return (
				<WithGenericHelpMessage
					requestError={`HTTP error ${statusCode}: Error fetching current permissions. Your API token could not be generated. `}
				/>
			);
		case ApiTokenErrorType.GENERATE_TOKEN_ERROR:
			return (
				<WithGenericHelpMessage
					requestError={`HTTP error ${statusCode}: Your API token could not be generated. `}
				/>
			);
		case ApiTokenErrorType.REVOKE_TOKEN_ERROR:
			return (
				<WithGenericHelpMessage
					requestError={`HTTP error ${statusCode}: Your API token could not be revoked. `}
				/>
			);
		case ApiTokenErrorType.FETCH_TOKENS_ERROR:
			return (
				<WithGenericHelpMessage
					requestError={`HTTP error ${statusCode}: Your existing API tokens could not be fetched. `}
				/>
			);
		case ApiTokenErrorType.NO_VALID_PERMISSIONS_ERROR:
			return (
				<span>
					You do not have permissions to generate an API token. Your permissions may have changed
					recently. Please contact the <DMSAdminContact /> to gain the correct permissions.
				</span>
			);
		default:
			return <WithGenericHelpMessage requestError={`Your request could not be completed. `} />;
	}
};

const ApiTokenInfo = () => {
	const { user } = useAuthContext();
	const [existingApiToken, setExistingApiToken] = useState<ApiToken | null>(null);
	const [isCopyingToken, setIsCopyingToken] = React.useState(false);
	const [copySuccess, setCopySuccess] = React.useState(false);
	const [requestError, setRequestError] = React.useState<ErrorResponse | null>(null);
	const theme = useTheme();
	const { NEXT_PUBLIC_AUTH_PROVIDER } = getConfig();

	const apiKeyEndpoint =
		NEXT_PUBLIC_AUTH_PROVIDER === AUTH_PROVIDER.KEYCLOAK
			? INTERNAL_API_PROXY.PROTECTED_KEYCLOAK_APIKEY_ENDPOINT
			: INTERNAL_API_PROXY.PROTECTED_EGO_APIKEY_ENDPOINT;

	const getUserScopes = async (userId: string) => {
		return NEXT_PUBLIC_AUTH_PROVIDER === AUTH_PROVIDER.KEYCLOAK
			? await fetch(urlJoin(INTERNAL_API_PROXY.PROTECTED_KEYCLOAK_TOKEN_ENDPOINT), {
					method: 'POST',
					body: permissionBodyParams(),
			  })
					.then((res) => {
						if (res.status !== 200) {
							setRequestError({ type: ApiTokenErrorType.SCOPES_ERROR, statusCode: res.status });
							throw new Error(`${res.status}: ${ApiTokenErrorType.SCOPES_ERROR}`);
						}
						return res.json();
					})
					.then((permissions) => scopesFromPermissions(permissions))
					.catch((err: Error) => {
						console.warn(err);
						return err;
					})
			: await fetch(
					urlJoin(INTERNAL_API_PROXY.PROTECTED_EGO_API_SCOPES_ENDPOINT, `?userId=${userId}`),
					{ method: 'GET' },
			  )
					.then((res) => {
						if (res.status !== 200) {
							setRequestError({ type: ApiTokenErrorType.SCOPES_ERROR, statusCode: res.status });
							throw new Error(`${res.status}: ${ApiTokenErrorType.SCOPES_ERROR}`);
						}
						return res.json();
					})
					.then((json) => json.scopes)
					.catch((err: Error) => {
						console.warn(err);
						return err;
					});
	};

	// still need to display any errors for the generate request, as permissions may have changed in between
	// the time a user signed in and when they attempted to generate a token
	const generateApiToken = async () => {
		if (user) {
			const scopesResult = await getUserScopes(user?.id);

			// prevent api token request if scopes request fails
			if (!Array.isArray(scopesResult)) {
				return;
			}

			const filteredScopes = scopesResult
				.map((s: string) => parseScope(s))
				.filter((s: ScopeObj) => s.accessLevel !== AccessLevel.DENY);

			if (filteredScopes.length) {
				const scopeParams = filteredScopes.map((f: ScopeObj) => `${f.policy}.${f.accessLevel}`);

				const searchParam = new URLSearchParams({ user_id: user.id });
				scopeParams.map((param) => searchParam.append('scopes', encodeURIComponent(param)));

				const fullUrlApiKeyService = urlJoin(apiKeyEndpoint, `?${searchParam}`);

				return fetch(fullUrlApiKeyService, { method: 'POST' })
					.then((res) => {
						if (res.status !== 200) {
							setRequestError({
								type: ApiTokenErrorType.GENERATE_TOKEN_ERROR,
								statusCode: res.status,
							});
							throw new Error(`${res.status}: ${ApiTokenErrorType.GENERATE_TOKEN_ERROR}`);
						}
						return res.json();
					})
					.then((newApiToken: ApiToken) => {
						setExistingApiToken(newApiToken);
						setRequestError(null);
					})
					.catch((err: Error) => {
						console.warn(err.message);
						return err;
					});
			} else {
				// request for apiToken is skipped if filteredScopes is empty
				setRequestError({ type: ApiTokenErrorType.NO_VALID_PERMISSIONS_ERROR });
			}
		}
	};

	const revokeApiToken = async () => {
		return (
			existingApiToken &&
			fetch(urlJoin(apiKeyEndpoint, `?apiKey=${existingApiToken.name}`), {
				method: 'DELETE',
			})
				.then((res) => {
					if (res.status !== 200) {
						setRequestError({ type: ApiTokenErrorType.REVOKE_TOKEN_ERROR, statusCode: res.status });
						throw new Error(`${res.status}: ${ApiTokenErrorType.REVOKE_TOKEN_ERROR}`);
					}
					setExistingApiToken(null);
					setRequestError(null);
				})
				.catch((err: Error) => {
					console.warn(err);
				})
		);
	};

	const copyApiToken = (text: string) => {
		setIsCopyingToken(true);
		navigator.clipboard
			.writeText(text)
			.then(async () => {
				await setIsCopyingToken(false);
				await setCopySuccess(true);
				await sleep();
				setCopySuccess(false);
			})
			.catch((err) => {
				console.warn('Failed to copy token! ', err);
				setIsCopyingToken(false);
			});
	};

	const parsedExpiry: number = existingApiToken ? parseExpiry(existingApiToken?.expiryDate) : 0;
	const tokenIsExpired: boolean = has(existingApiToken, 'expiryDate') && parsedExpiry <= 0;

	const displayToken = (token: ApiToken | null) => {
		if (!token) {
			return 'You have no API token...';
		} else if (token.name) {
			return token.name;
		} else {
			return 'API token encrypted';
		}
	};

	useEffect(() => {
		if (user) {
			const searchParam = new URLSearchParams({
				sort: 'isRevoked',
				sortOrder: 'ASC',
				user_id: user.id,
				limit: '1000',
			});

			fetch(urlJoin(apiKeyEndpoint, `?${searchParam}`), { method: 'GET' })
				.then((res) => {
					if (res.status !== 200) {
						setRequestError({ type: ApiTokenErrorType.FETCH_TOKENS_ERROR, statusCode: res.status });
						throw new Error(`${res.status}: ${ApiTokenErrorType.FETCH_TOKENS_ERROR}`);
					}
					return res.json();
				})
				.then((json) => {
					setRequestError(null);
					// first find all non-revoked tokens
					const unrevokedTokens = json.resultSet.filter((r: ApiToken) => !r.isRevoked);
					// then sort by expiry date
					const unrevokedTokensSortedByExpiry = orderBy(unrevokedTokens, 'expiryDate', ['desc']);
					// find most recent token that is not revoked and not expired, if it exists
					const activeToken = unrevokedTokensSortedByExpiry.find((r: ApiToken) => {
						const expiry = parseExpiry(r.expiryDate) || 0;
						return expiry > 0;
					});
					// display either this activeToken, or the most recently expired non-revoked token
					const tokenToDisplay = activeToken || unrevokedTokensSortedByExpiry[0];
					if (tokenToDisplay) {
						setExistingApiToken(tokenToDisplay);
					} else {
						setExistingApiToken(null);
					}
				})
				.catch((err: Error) => {
					console.warn('Error: ' + err.message);
				});
			// }
		}
	}, []);

	const userEffectiveScopes = (user?.scope || [])
		.map((s) => parseScope(s))
		.filter((s: ScopeObj) => {
			return s.accessLevel !== AccessLevel.DENY;
		});

	const userHasScopes = userEffectiveScopes.length > 0;

	return (
		<div>
			<h2
				css={css`
					${theme.typography.regular};
					font-size: 24px;
					line-height: 40px;
					color: ${theme.colors.accent_dark};
				`}
			>
				API Token
			</h2>
			<ol
				css={css`
					${theme.typography.subheading};
					font-weight: normal;
					color: ${theme.colors.accent_dark};
					margin-bottom: 1rem;
				`}
			>
				<li>Your API token is used to download controlled access data.</li>
				<li>
					Your API token is associated with your user credentials and should <strong>NEVER</strong>{' '}
					be shared with anyone.
				</li>
				<li>When you generate a new token, all previous tokens become invalid.</li>
				<li>Expired and revoked tokens also become invalid.</li>
			</ol>
			<div
				css={css`
					margin-bottom: 1rem;
					margin-top: 0.5rem;
				`}
			>
				{!userHasScopes && (
					<ErrorNotification title="Invalid Permissions" size="md">
						You do not have permissions to generate an API token. Please contact the{' '}
						<DMSAdminContact /> to gain the correct permissions.
					</ErrorNotification>
				)}
			</div>
			{requestError?.type && (
				<div
					css={css`
						margin: 1.5rem 0;
					`}
				>
					<ErrorNotification
						size="sm"
						css={css`
							background-color: ${theme.colors.error_1};
							color: ${theme.colors.accent_dark};
						`}
						dismissible
						onDismiss={() => setRequestError(null)}
					>
						<span
							css={css`
								font-size: 14px;
								display: block;
							`}
						>
							{getErrorMessage(requestError)}
						</span>
					</ErrorNotification>
				</div>
			)}
			<div
				css={css`
					display: flex;
					flex-direction: row;
					margin-bottom: 10px;
				`}
			>
				<Button
					css={css`
						margin-right: 10px;
					`}
					onClick={() => generateApiToken()}
					isAsync
					disabled={!userHasScopes}
				>
					Generate New Token
				</Button>
				<Button
					disabled={isEmpty(existingApiToken) || tokenIsExpired}
					isAsync
					css={css`
						background-color: ${theme.colors.white};
						color: ${theme.colors.accent_dark};
						border: 1px solid ${theme.colors.grey_5};
						&:hover {
							background-color: ${theme.colors.accent_1};
						}
					`}
					onClick={() => revokeApiToken()}
				>
					Revoke Token
				</Button>
			</div>
			<div
				css={css`
					position: relative;
					display: flex;
					flex-direction: row;
					justify-content: space-between;
					margin-bottom: 1rem;
					margin-top: 1rem;
					max-width: 600px;
				`}
			>
				<div
					css={css`
						border: 1px solid ${theme.colors.grey_5};
						border-radius: 5px 0px 0px 5px;
						border-right: 0px;
						color: ${isEmpty(existingApiToken) ? theme.colors.grey_6 : theme.colors.black};
						width: 100%;
						display: flex;
						align-items: center;
						padding-left: 5px;
					`}
				>
					{existingApiToken && (
						<div
							css={css`
								color: ${theme.colors.white};
								border-radius: 6px;
								padding: 3px 8px;
								margin-right: 5px;
								display: flex;
								justify-content: center;
								align-items: center;
								${theme.typography.label}
								${tokenIsExpired
									? `background-color: ${theme.colors.error_dark}`
									: `background-color: ${theme.colors.grey_6};`}
							`}
						>
							{tokenIsExpired ? 'Expired' : getDayValue(parsedExpiry)}
						</div>
					)}
					<span
						css={css`
							white-space: nowrap;
							overflow: hidden;
							text-overflow: ellipsis;
							${theme.typography.subheading}
							font-weight: normal;
							padding-right: 5px;
							padding-left: 5px;
							${tokenIsExpired ? 'opacity: 0.3' : ''}
						`}
					>
						{displayToken(existingApiToken)}
					</span>
				</div>
				<>
					<Global
						styles={css`
							.tippy-popper .leave {
								opacity: 0;
							}
						`}
					/>
					<CustomTooltip
						unmountHTMLWhenHide
						open={copySuccess}
						arrow
						html={
							<TooltipContainer theme={theme} id="tooltip">
								Copied!
							</TooltipContainer>
						}
						position="top"
					>
						<Button
							disabled={
								isEmpty(existingApiToken) ||
								isCopyingToken ||
								tokenIsExpired ||
								!existingApiToken?.name
							}
							css={() =>
								css`
									border-radius: 0px 5px 5px 0px;
									width: 69px;
									height: 36px;
									position: relative;
								`
							}
							onClick={() =>
								existingApiToken?.name && !tokenIsExpired
									? copyApiToken(existingApiToken.name)
									: null
							}
						>
							<span
								css={css`
									position: absolute;
									top: 8px;
									left: 24px;
									visibility: ${copySuccess ? 'visible' : 'hidden'};
								`}
							>
								<Checkmark width={20} height={20} fill={theme.colors.white} />
							</span>
							<span
								css={css`
									visibility: ${copySuccess ? 'hidden' : 'visible'};
								`}
							>
								Copy
							</span>
						</Button>
					</CustomTooltip>
				</>
			</div>
			<div
				css={css`
					margin-top: 2rem;
				`}
			>
				<span
					css={css`
						${theme.typography.subheading};
						font-weight: normal;
						color: ${theme.colors.accent_dark};
					`}
				>
					For more information, please read the{' '}
					<StyledLink href={``}>instructions on how to download data</StyledLink>.
				</span>
			</div>
		</div>
	);
};

export default ApiTokenInfo;
