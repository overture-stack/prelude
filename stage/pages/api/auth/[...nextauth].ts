import type { GetServerSidePropsContext, NextApiRequest, NextApiResponse } from 'next';
import NextAuth, { AuthOptions } from 'next-auth';
import KeycloakProvider from 'next-auth/providers/keycloak';
import axios from 'axios';

import { getConfig } from '@/global/config';
import { KEYCLOAK_URL_ISSUER, KEYCLOAK_URL_TOKEN, AUTH_PROVIDER } from '@/global/utils/constants';
import { encryptContent } from '@/global/utils/crypt';
import { permissionBodyParams, scopesFromPermissions } from '@/global/utils/keycloakUtils';

const {
  NEXT_PUBLIC_KEYCLOAK_CLIENT_ID,
  KEYCLOAK_CLIENT_SECRET,
  SESSION_ENCRYPTION_SECRET,
} = getConfig();

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
    providers: [
      KeycloakProvider({
        clientId: NEXT_PUBLIC_KEYCLOAK_CLIENT_ID,
        clientSecret: KEYCLOAK_CLIENT_SECRET,
        issuer: KEYCLOAK_URL_ISSUER,
      }),
    ],
    pages: {
      signIn: '/login',
    },
    callbacks: {
      async jwt({ token, user, account, profile, trigger }: any) {
        if (trigger === 'signIn' && account?.provider === AUTH_PROVIDER.KEYCLOAK) {
          token.account = account;
          token.profile = profile;
          token.scopes = await fetchScopes(token.account.access_token);
        }
        return token;
      },
      async session({ token, session }: any) {
        if (token.account.provider === AUTH_PROVIDER.KEYCLOAK) {
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
      strategy: 'jwt',
      maxAge: 60 * 60, // 1 hour
    },
    debug: false,
  };
};

export default async function auth(req: NextApiRequest, res: NextApiResponse) {
  return await NextAuth(req, res, getAuthOptions(req));
}