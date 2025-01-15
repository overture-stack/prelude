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

import Root from '../components/Root';
import { AppContext } from 'next/app';
import { SessionProvider, getSession } from 'next-auth/react';

import { AUTH_PROVIDER, LOGIN_PATH } from '../global/utils/constants';
import { PageWithConfig } from '../global/utils/pages/types';
import { useEffect } from 'react';
import Router from 'next/router';
import getInternalLink from '../global/utils/getInternalLink';
import { isValidJwt } from '../global/utils/egoTokenUtils';
import { getConfig } from '../global/config';
import { decryptContent } from '@/global/utils/crypt';

const DMSApp = ({
	Component,
	pageProps,
	ctx,
	session,
}: {
	Component: PageWithConfig;
	pageProps: { [k: string]: any };
	ctx: any;
	session: any;
}) => {
	const { NEXT_PUBLIC_AUTH_PROVIDER } = getConfig();
	useEffect(() => {
		if (NEXT_PUBLIC_AUTH_PROVIDER === AUTH_PROVIDER.EGO) {
			if (
				(!session || !isValidJwt(decryptContent(session?.account?.accessToken))) &&
				!Component.isPublic
			) {
				// redirect to logout when token is expired/missing only if user is on a non-public page
				Router.push({
					pathname: getInternalLink({ path: LOGIN_PATH }),
					query: { session_expired: true },
				});
			}
		} else if (NEXT_PUBLIC_AUTH_PROVIDER === AUTH_PROVIDER.KEYCLOAK) {
			if (!session && !Component.isPublic) {
				Router.push({
					pathname: getInternalLink({ path: LOGIN_PATH }),
					query: { session_expired: true },
				});
			}
		}
	}),
		[session];

	return (
		<SessionProvider session={session}>
			<Root pageContext={ctx} session={session}>
				<Component {...pageProps} />
			</Root>
		</SessionProvider>
	);
};

DMSApp.getInitialProps = async ({ ctx, Component }: AppContext & { Component: PageWithConfig }) => {
	const pageProps = await Component.getInitialProps({ ...ctx });
	const session = await getSession(ctx);
	return {
		ctx: {
			pathname: ctx.pathname,
			query: ctx.query,
			asPath: ctx.asPath,
		},
		pageProps,
		session,
	};
};

export default DMSApp;
