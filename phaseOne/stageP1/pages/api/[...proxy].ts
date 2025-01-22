import type { NextApiRequest, NextApiResponse } from 'next';
import httpProxy from 'http-proxy';

import { getConfig } from '@/global/config';
import { INTERNAL_API_PROXY } from '@/global/utils/constants';
import { removeFromPath, SSLSecured } from '@/global/utils/proxyUtils';

const proxy = httpProxy.createProxyServer();

const { NEXT_PUBLIC_ARRANGER_COMPOSITION_API,NEXT_PUBLIC_ARRANGER_INSTRUMENT_API } = getConfig();

// You can export a config variable from any API route in Next.js.
// We'll use this to disable the bodyParser, otherwise Next.js
// would read and parse the entire request body before we
// can forward the request to the API. By skipping the bodyParser,
// we can just stream all requests through to the actual API.
export const config = {
	api: {
		bodyParser: false,
		externalResolver: true,
	},
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	let path = req.url;
	let target = '';
	if (req.url?.startsWith(INTERNAL_API_PROXY.COMPOSITION_ARRANGER)) {
		path = removeFromPath(req?.url, INTERNAL_API_PROXY.COMPOSITION_ARRANGER);
		target = NEXT_PUBLIC_ARRANGER_COMPOSITION_API;
	} else if (req.url?.startsWith(INTERNAL_API_PROXY.INSTRUMENT_ARRANGER)) {
		path = removeFromPath(req?.url, INTERNAL_API_PROXY.INSTRUMENT_ARRANGER);
		target = NEXT_PUBLIC_ARRANGER_INSTRUMENT_API;
	} else {
		return res.status(404).end();
	}
	req.url = path;

	// Don't forward cookies to the API:
	req.headers.cookie = '';

	console.info(`proxy without authentication - proxing to target:${target} path:${path}`);

	proxy.web(
		req,
		res,
		{
			target,
			changeOrigin: true,
			secure: SSLSecured,
		},
		(err) => {
			console.error(`Proxy error URL: ${req.url}. Error: ${JSON.stringify(err)}`);

			return res.status(500).json(err);
		},
	);
}