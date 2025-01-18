import type { GetServerSidePropsContext, NextApiRequest, NextApiResponse } from 'next';
import NextAuth, { AuthOptions } from 'next-auth';
import KeycloakProvider from 'next-auth/providers/keycloak';
import { OAuthConfig } from 'next-auth/providers';
import urlJoin from 'url-join';

import axios from 'axios';

import { getConfig } from '@/global/config';
import { KEYCLOAK_URL_ISSUER, AUTH_PROVIDER, KEYCLOAK_URL_TOKEN } from '@/global/utils/constants';
import { decodeToken, extractUser } from '@/global/utils/egoTokenUtils';
import { encryptContent } from '@/global/utils/crypt';
import { permissionBodyParams, scopesFromPermissions } from '@/global/utils/keycloakUtils';

const {
	NEXT_PUBLIC_KEYCLOAK_CLIENT_ID,
	KEYCLOAK_CLIENT_SECRET,
	SESSION_ENCRYPTION_SECRET,
	NEXT_PUBLIC_EGO_API_ROOT,
	NEXT_PUBLIC_EGO_CLIENT_ID,
} = getConfig();

const egoLoginUrl = urlJoin(
	NEXT_PUBLIC_EGO_API_ROOT,
	`/oauth/ego-token?client_id=${NEXT_PUBLIC_EGO_CLIENT_ID}`,
);

const fetchEgoToken = async (login_nonce: string) => {
	const { data } = await axios.post(egoLoginUrl, null, {
		headers: { Accept: '*/*', Cookie: `LOGIN_NONCE=${login_nonce}` },
	});

	return data;
};

export const fetchScopes = async (accessToken: string) => {
	const { data } = await axios.post(KEYCLOAK_URL_TOKEN, permissionBodyParams(), {
		headers: {
			'content-type': 'application/x-www-form-urlencoded',
			authorization: 'Bearer ' + accessToken,
			accept: '*/*',
		},
	});

	return data ? scopesFromPermissions(data) : [];
};

export const getAuthOptions = (
	req: GetServerSidePropsContext['req'] | NextApiRequest,
): AuthOptions => {
	return {
		secret: SESSION_ENCRYPTION_SECRET,
		// Configure one or more authentication providers
		providers: [
			KeycloakProvider({
				clientId: NEXT_PUBLIC_KEYCLOAK_CLIENT_ID,
				clientSecret: KEYCLOAK_CLIENT_SECRET,
				issuer: KEYCLOAK_URL_ISSUER,
			}),
			{
				id: AUTH_PROVIDER.EGO,
				name: AUTH_PROVIDER.EGO,
				type: 'oauth',
				authorization: {
					url: '',
				},
				token: {
					url: undefined,
				},
				userinfo: {
					url: undefined,
					async request() {
						return {
							login_nonce: req.cookies['LOGIN_NONCE'],
						};
					},
				},
				async profile({ login_nonce }: any) {
					const egoToken = login_nonce ? await fetchEgoToken(login_nonce) : null;

					const userInfo = egoToken ? decodeToken(egoToken) : null;
					if (userInfo) {
						const user = extractUser(userInfo);

						return {
							egoToken: egoToken,
							...user,
						};
					}
					return null;
				},
				checks: ['none'],
				clientId: NEXT_PUBLIC_EGO_CLIENT_ID,
			} as OAuthConfig<any>,
		],
		pages: {
			signIn: '/login',
		},
		callbacks: {
			async jwt({ token, user, account, profile, trigger }: any) {
				if (trigger === 'signIn') {
					if (account?.provider == AUTH_PROVIDER.EGO) {
						token.account = account;
						token.profile = user;
					} else if (account?.provider == AUTH_PROVIDER.KEYCLOAK) {
						token.account = account;
						token.profile = profile;
						token.scopes = await fetchScopes(token.account.access_token);
					}
				}

				return token;
			},
			async session({ token, session }: any) {
				// Send properties to the client, like an access_token and user id from a provider.
				if (token.account.provider == AUTH_PROVIDER.EGO) {
					const { egoToken, scope, ...profileWithoutEgoToken } = token.profile;
					session.account = {
						accessToken: encryptContent(egoToken),
						provider: token?.account?.provider,
					};
					session.scopes = scope;
					session.user = { ...profileWithoutEgoToken };
				} else if (token.account.provider == AUTH_PROVIDER.KEYCLOAK) {
					session.account = {
						accessToken: encryptContent(token?.account?.access_token),
						provider: token?.account?.provider,
					};
					session.user.firstName = token?.profile?.given_name;
					session.user.lastName = token?.profile?.family_name;
					session.user.emailVerified = token?.profile?.email_verified;
					session.user.id = token?.sub;
					if (!session.user.email) session.user.email = token?.profile?.email;
					session.scopes = token?.scopes;
				}

				return session;
			},
		},
		session: {
			// Encrypted JWT (JWE) stored in the session cookie.
			strategy: 'jwt',
			// Seconds - How long until an idle session expires and is no longer valid.
			maxAge: 60 * 60, // 1 hour
		},
		debug: false,
	};
};

export default async function auth(req: NextApiRequest, res: NextApiResponse) {
	return await NextAuth(req, res, getAuthOptions(req));
}
