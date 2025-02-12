import urlJoin from 'url-join';

import { getConfig } from '../config';

const { NEXT_PUBLIC_KEYCLOAK_HOST, NEXT_PUBLIC_KEYCLOAK_REALM } = getConfig();

export const EXPLORER_PATH = '/explorer';
export const USER_PATH = '/user';
export const LOGIN_PATH = '/login';

export const ROOT_PATH = '/';

export enum INTERNAL_PATHS {
	FILE = '/file',
	TABULAR = '/tabular',
	HOME = '/home',
	DOCUMENTATION = '/documentation',
	SONG = '/swaggerDocs/song',
	LYRIC = '/swaggerDocs/lyric',
	LECTERN = '/swaggerDocs/lectern',
	SCORE = '/swaggerDocs/score',
}

// external docs links
export const DOCS_URL = 'https://docs.overture.bio/';
export const HELP_URL = 'https://github.com/overture-stack/docs/discussions/new?category=support';
export const EMAIL_SETTING_URL = 'admin@example.com';

// keycloak
export const KEYCLOAK_URL_ISSUER = urlJoin(NEXT_PUBLIC_KEYCLOAK_HOST, 'realms', NEXT_PUBLIC_KEYCLOAK_REALM);
export const KEYCLOAK_URL_TOKEN = urlJoin(KEYCLOAK_URL_ISSUER, 'protocol/openid-connect/token');
export const KEYCLOAK_API_KEY_ENDPOINT = urlJoin(KEYCLOAK_URL_ISSUER, 'apikey/api_key');

export const AUTH_PROVIDER = {
	KEYCLOAK: 'keycloak',
};

const PROXY_API_PATH = '/api';
const PROXY_PROTECTED_API_PATH = '/api/protected';

export const INTERNAL_API_PROXY = {
	// Existing Arranger endpoints
	FILE_ARRANGER: urlJoin(PROXY_API_PATH, 'file_arranger'),
	TABULAR_ARRANGER: urlJoin(PROXY_API_PATH, 'tabular_arranger'),
	PROTECTED_ARRANGER: urlJoin(PROXY_PROTECTED_API_PATH, 'arranger'),
	PROTECTED_KEYCLOAK_APIKEY_ENDPOINT: urlJoin(PROXY_PROTECTED_API_PATH, 'keycloak/apikey'),
	PROTECTED_KEYCLOAK_TOKEN_ENDPOINT: urlJoin(PROXY_PROTECTED_API_PATH, 'keycloak/token'),

	// Service endpoints
	SONG: urlJoin(PROXY_API_PATH, 'song'),
	LYRIC: urlJoin(PROXY_API_PATH, 'lyric'),
	LECTERN: urlJoin(PROXY_API_PATH, 'lectern'),
	SCORE: urlJoin(PROXY_API_PATH, 'score'),
} as const;

// Add API paths for Swagger documentation
export const API_DOCS_PATHS = {
	SONG: urlJoin(INTERNAL_API_PROXY.SONG, 'swagger-api'),
	LYRIC: urlJoin(INTERNAL_API_PROXY.LYRIC, 'swagger-api'),
	LECTERN: urlJoin(INTERNAL_API_PROXY.LECTERN, 'swagger-api'),
	SCORE: urlJoin(INTERNAL_API_PROXY.SCORE, 'swagger-api'),
} as const;
