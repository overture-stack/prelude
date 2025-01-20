import type { NextApiRequest, NextApiResponse } from 'next';
import httpProxy from 'http-proxy';

import { getConfig } from '@/global/config';
import { INTERNAL_API_PROXY } from '@/global/utils/constants';
import { removeFromPath, SSLSecured } from '@/global/utils/proxyUtils';

const proxy = httpProxy.createProxyServer();

const { 
  NEXT_PUBLIC_ARRANGER_COMPOSITION_API,
  NEXT_PUBLIC_ARRANGER_INSTRUMENT_API,
  NEXT_PUBLIC_SONG_API,
} = getConfig();

export const config = {
  api: {
    bodyParser: false,
    externalResolver: true,
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
  
  if (req.url?.startsWith(INTERNAL_API_PROXY.COMPOSITION_ARRANGER)) {
    path = removeFromPath(req?.url, INTERNAL_API_PROXY.COMPOSITION_ARRANGER);
    target = NEXT_PUBLIC_ARRANGER_COMPOSITION_API;
  } else if (req.url?.startsWith(INTERNAL_API_PROXY.INSTRUMENT_ARRANGER)) {
    path = removeFromPath(req?.url, INTERNAL_API_PROXY.INSTRUMENT_ARRANGER);
    target = NEXT_PUBLIC_ARRANGER_INSTRUMENT_API;
  } else if (req.url?.startsWith(INTERNAL_API_PROXY.SONG)) {
    path = removeFromPath(req?.url, INTERNAL_API_PROXY.SONG);
    target = NEXT_PUBLIC_SONG_API;
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