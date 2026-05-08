import { getSession, SessionProvider } from 'next-auth/react';
import { AppContext } from 'next/app';
import { useState } from 'react';
import Root from '../components/Root';
import type { ThemeConfig } from '../lib/themeConfig';
import { PageWithConfig } from '../global/utils/pages/types';

const DMSApp = ({
	Component,
	pageProps,
	ctx,
	session,
	themeConfig,
}: {
	Component: PageWithConfig;
	pageProps: { [k: string]: any };
	ctx: any;
	session: any;
	themeConfig: ThemeConfig;
}) => {
	// Initialised once from SSR data — client navigations won't reset this
	const [resolvedThemeConfig] = useState<ThemeConfig>(themeConfig ?? {});

	return (
		<SessionProvider session={session}>
			<Root pageContext={ctx} session={session} themeConfig={resolvedThemeConfig}>
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

	// Read theme.config.json server-side only — serialised into initial HTML,
	// hydrated on client without a second request and without a flash.
	// Dynamic require prevents webpack from bundling the 'fs' module for the client.
	let themeConfig: ThemeConfig = {};
	if (typeof window === 'undefined') {
		const { loadThemeConfig } = require('../lib/loadThemeConfig');
		themeConfig = loadThemeConfig();
	}

	return {
		ctx: {
			pathname: ctx.pathname,
			query: ctx.query,
			asPath: ctx.asPath,
		},
		pageProps,
		session,
		themeConfig,
	};
};

export default DMSApp;
