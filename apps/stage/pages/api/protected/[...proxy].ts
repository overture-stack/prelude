import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import httpProxy from 'http-proxy';

import { getAuthOptions } from '../auth/[...nextauth]';
import { getConfig } from '@/global/config';
import {
	INTERNAL_API_PROXY,
	KEYCLOAK_API_KEY_ENDPOINT,
	KEYCLOAK_URL_TOKEN,
} from '@/global/utils/constants';
import { decryptContent } from '@/global/utils/crypt';
import { removeFromPath, SSLSecured } from '@/global/utils/proxyUtils';

const proxy = httpProxy.createProxyServer();

const { NEXT_PUBLIC_ARRANGER_API } = getConfig();

// You can export a config variable from any API route in Next.js.
// We'll use this to disable the bodyParser, otherwise Next.js
// would read and parse the entire request body before we
// can forward the request to the API. By skipping the bodyParser,
// we can just stream all requests through to the actual API.
export const config = {
	api: {
		bodyParser: false,
	},
};

// Add event listener for proxyRes to handle CORS headers
proxy.on('proxyRes', (proxyRes, req, res) => {
	const response = res as NextApiResponse;
	response.setHeader('Access-Control-Allow-Origin', '*');
	response.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
	response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
	response.setHeader('Access-Control-Allow-Credentials', 'true');
  });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	 // Handle preflight requests
	 if (req.method === 'OPTIONS') {
		res.setHeader('Access-Control-Allow-Origin', '*');
		res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
		res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
		res.setHeader('Access-Control-Allow-Credentials', 'true');
		return res.status(200).end();
	  }
	
	let path = req.url;
	let target = '';
	if (req.url?.startsWith(INTERNAL_API_PROXY.PROTECTED_ARRANGER)) {
		path = removeFromPath(req?.url, INTERNAL_API_PROXY.PROTECTED_ARRANGER);
		target = NEXT_PUBLIC_ARRANGER_API;
	} else if (req.url?.startsWith(INTERNAL_API_PROXY.PROTECTED_KEYCLOAK_APIKEY_ENDPOINT)) {
		path = removeFromPath(req?.url, INTERNAL_API_PROXY.PROTECTED_KEYCLOAK_APIKEY_ENDPOINT);
		target = KEYCLOAK_API_KEY_ENDPOINT;
	} else if (req.url?.startsWith(INTERNAL_API_PROXY.PROTECTED_KEYCLOAK_TOKEN_ENDPOINT)) {
		path = removeFromPath(req?.url, INTERNAL_API_PROXY.PROTECTED_KEYCLOAK_TOKEN_ENDPOINT);
		target = KEYCLOAK_URL_TOKEN;
	} else {
		return res.status(404).end();
	}
	req.url = path;

	const session = await getServerSession(req, res, getAuthOptions(req));

	console.info(`protected proxy - proxing to target:${target} path:${path}`);

	if (session?.account?.accessToken) {
		req.headers['Authorization'] = 'Bearer ' + decryptContent(session?.account?.accessToken);
	}

	// Don't forward cookies to the API:
	req.headers.cookie = '';

	proxy.web(
		req,
		res,
		{
			target,
			changeOrigin: true,
			secure: SSLSecured,
			headers: {
			  'Access-Control-Allow-Origin': '*',
			},
		},
		(err) => {
			console.error(`Proxy error URL: ${req.url}. Error: ${JSON.stringify(err)}`);
			return res.status(500).json(err);
		},
	);
}
