import { getConfig } from '@/global/config';
import { INTERNAL_API_PROXY } from '@/global/utils/constants';
import { removeFromPath, SSLSecured } from '@/global/utils/proxyUtils';
import type { ServerResponse } from 'http';
import httpProxy from 'http-proxy';
import type { NextApiRequest, NextApiResponse } from 'next';

const proxy = httpProxy.createProxyServer();

const {
	NEXT_PUBLIC_ARRANGER_DATATABLE_1_API,
	NEXT_PUBLIC_ARRANGER_DATATABLE_2_API,
	NEXT_PUBLIC_ARRANGER_MOLECULAR_DATA_API,
	NEXT_PUBLIC_SONG_API,
	NEXT_PUBLIC_LYRIC_API,
	NEXT_PUBLIC_LECTERN_API,
	NEXT_PUBLIC_SCORE_API,
} = getConfig();

export const config = {
	api: {
		bodyParser: false,
		externalResolver: true,
	},
};

// Error handling
proxy.on('error', function (err, req, res) {
	const response = res as ServerResponse;
	if (!response.headersSent) {
		response.writeHead(500, { 'Content-Type': 'application/json' });
		response.end(JSON.stringify({ error: 'Proxy Server Error', details: err.message }));
	}
	console.error('Proxy Server Error:', err);
});

// Request logging
proxy.on('proxyReq', function (proxyReq, req, _res) {
	console.log('Proxy Request:', {
		path: proxyReq.path,
		target: proxyReq.getHeader('host'),
		originalUrl: (req as NextApiRequest).url,
	});
});

// Response handling
proxy.on('proxyRes', function (proxyRes, req, res) {
	const response = res as ServerResponse;
	response.setHeader('Access-Control-Allow-Origin', '*');
	response.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
	response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
	response.setHeader('Access-Control-Allow-Credentials', 'true');

	// Log response status
	console.log('Proxy Response:', {
		status: proxyRes.statusCode,
		path: (req as NextApiRequest).url,
	});
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	try {
		// Handle CORS preflight
		if (req.method === 'OPTIONS') {
			res.setHeader('Access-Control-Allow-Origin', '*');
			res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
			res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
			res.setHeader('Access-Control-Allow-Credentials', 'true');
			return res.status(200).end();
		}

		let path = req.url;
		let target = '';

		// Handle Arranger requests
		if (req.url?.startsWith(INTERNAL_API_PROXY.MOLECULAR_ARRANGER)) {
			path = removeFromPath(req?.url, INTERNAL_API_PROXY.MOLECULAR_ARRANGER);
			target = NEXT_PUBLIC_ARRANGER_MOLECULAR_DATA_API;
		} else if (req.url?.startsWith(INTERNAL_API_PROXY.DATATABLE_1_ARRANGER)) {
			path = removeFromPath(req?.url, INTERNAL_API_PROXY.DATATABLE_1_ARRANGER);
			target = NEXT_PUBLIC_ARRANGER_DATATABLE_1_API;
		} else if (req.url?.startsWith(INTERNAL_API_PROXY.DATATABLE_2_ARRANGER)) {
			path = removeFromPath(req?.url, INTERNAL_API_PROXY.DATATABLE_2_ARRANGER);
			target = NEXT_PUBLIC_ARRANGER_DATATABLE_2_API;
		}
		// Handle Service API requests
		else if (path?.startsWith('/api/song/')) {
			// Special case for Swagger API docs - try multiple possible paths
			if (path.match(/\/(api-docs|swagger|docs|openapi|v2\/api-docs)/)) {
				path = '/v2/api-docs';
			} else {
				path = path.replace('/api/song', '');
			}
			target = NEXT_PUBLIC_SONG_API;
		} else if (path?.startsWith('/api/lyric/')) {
			// Special case for Swagger API docs - try multiple possible paths
			if (path.match(/\/(api-docs|swagger|docs|openapi|v2\/api-docs)/)) {
				path = '/api-docs';
			} else {
				path = path.replace('/api/lyric', '');
			}
			target = NEXT_PUBLIC_LYRIC_API;
		} else if (path?.startsWith('/api/lectern/')) {
			// Special case for Swagger API docs - try multiple possible paths
			if (path.match(/\/(api-docs|swagger|docs|openapi|v2\/api-docs)/)) {
				path = '/api-docs';
			} else {
				path = path.replace('/api/lectern', '');
			}
			target = NEXT_PUBLIC_LECTERN_API;
		} else if (path?.startsWith('/api/score/')) {
			// Special case for Swagger API docs - try multiple possible paths
			if (path.match(/\/(api-docs|swagger|docs|openapi|v2\/api-docs)/)) {
				path = '/v2/api-docs';
			} else {
				path = path.replace('/api/score', '');
			}
			target = NEXT_PUBLIC_SCORE_API;
		} else {
			return res.status(404).json({ error: 'Service not found', path });
		}

		if (!target) {
			console.warn('No target found for path:', path);
			return res.status(404).json({ error: 'No target service configured', path });
		}

		// Update request URL
		req.url = path;

		// Don't forward cookies
		req.headers.cookie = '';

		console.log('Proxying request:', {
			path: req.url,
			target,
			method: req.method,
			originalUrl: path,
		});

		return new Promise((resolve, reject) => {
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
					timeout: 30000,
				},
				(err) => {
					console.error('Proxy error:', {
						error: err,
						path: req.url,
						target,
					});
					reject(err);
				},
			);
		}).catch((error: Error) => {
			console.error('Request failed:', error);
			if (!res.headersSent) {
				res.status(500).json({
					error: 'Proxy error occurred',
					message: error.message,
					target,
					path: req.url,
				});
			}
		});
	} catch (error) {
		const err = error as Error;
		console.error('Handler error:', err);
		if (!res.headersSent) {
			res.status(500).json({
				error: 'Internal server error',
				message: err.message,
			});
		}
	}
}
