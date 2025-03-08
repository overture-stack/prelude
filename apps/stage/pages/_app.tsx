import { getSession, SessionProvider } from 'next-auth/react';
import { AppContext } from 'next/app';
import Router from 'next/router';
import { useEffect } from 'react';
import Root from '../components/Root';
import { getConfig } from '../global/config';
import { AUTH_PROVIDER, LOGIN_PATH } from '../global/utils/constants';
import getInternalLink from '../global/utils/getInternalLink';
import { PageWithConfig } from '../global/utils/pages/types';

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
		if (NEXT_PUBLIC_AUTH_PROVIDER === AUTH_PROVIDER.KEYCLOAK) {
			if (!session && !Component.isPublic) {
				Router.push({
					pathname: getInternalLink({ path: LOGIN_PATH }),
					query: { session_expired: true },
				});
			}
		}
	}, [session, Component.isPublic, NEXT_PUBLIC_AUTH_PROVIDER]);

	return (
		<SessionProvider session={session}>
			<Root pageContext={ctx} session={session}>
				<Component {...pageProps} />
			</Root>
		</SessionProvider>
	);
};

DMSApp.getInitialProps = async ({ ctx, Component }: AppContext & { Component: PageWithConfig }) => {
	let pageProps = {};

	// Safely handle getInitialProps if it exists
	if (Component.getInitialProps) {
		try {
			pageProps = await Component.getInitialProps({ ...ctx });
		} catch (error) {
			console.error('Error in getInitialProps:', error);
		}
	}

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
