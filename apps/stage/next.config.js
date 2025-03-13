const path = require('path');
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const withPlugins = require('next-compose-plugins');
const { patchWebpackConfig: patchForGlobalCSS } = require('next-global-css');
const withTranspileModules = require('next-transpile-modules')(['swagger-ui-react', 'swagger-ui-dist']);
const ExtraWatchWebpackPlugin = require('extra-watch-webpack-plugin');

module.exports = withPlugins([withTranspileModules], {
	typescript: {
		ignoreBuildErrors: true,
	},
	webpack: (config, options) => {
		if (options.isServer) {
			config.externals = ['react', ...config.externals];
		} else {
			options.dev &&
				config.plugins.push(new ForkTsCheckerWebpackPlugin()) &&
				config.plugins.push(
					new ExtraWatchWebpackPlugin({
						dirs: [path.resolve(__dirname, '.', 'node_modules', 'react')],
					}),
				);
		}

		config.resolve.alias['@emotion/react'] = path.resolve(__dirname, '.', 'node_modules', '@emotion/react');
		config.resolve.alias['react'] = path.resolve(__dirname, '.', 'node_modules', 'react');

		process.env.NODE_ENV === 'development' && (config.optimization.minimize = false);

		return patchForGlobalCSS(config, options);
	},
	publicRuntimeConfig: {
		NEXT_PUBLIC_ADMIN_EMAIL: process.env.NEXT_PUBLIC_ADMIN_EMAIL,
		NEXT_PUBLIC_APP_COMMIT: process.env.APP_COMMIT,
		NEXT_PUBLIC_APP_VERSION: process.env.APP_VERSION,

		// DATASET_1
		NEXT_PUBLIC_ARRANGER_DATASET_1_API: process.env.NEXT_PUBLIC_ARRANGER_DATASET_1_API,
		NEXT_PUBLIC_ARRANGER_DATASET_1_DOCUMENT_TYPE: process.env.NEXT_PUBLIC_ARRANGER_DATASET_1_DOCUMENT_TYPE,
		NEXT_PUBLIC_ARRANGER_DATASET_1_INDEX: process.env.NEXT_PUBLIC_ARRANGER_DATASET_1_INDEX,
		NEXT_PUBLIC_ARRANGER_DATASET_1_CARDINALITY_PRECISION_THRESHOLD:
			process.env.NEXT_PUBLIC_ARRANGER_DATASET_1_CARDINALITY_PRECISION_THRESHOLD || 3000,
		NEXT_PUBLIC_ARRANGER_DATASET_1_MANIFEST_COLUMNS: process.env.NEXT_PUBLIC_ARRANGER_DATASET_1_MANIFEST_COLUMNS || '',
		NEXT_PUBLIC_ARRANGER_DATASET_1_MAX_BUCKET_COUNTS:
			process.env.NEXT_PUBLIC_ARRANGER_DATASET_1_MAX_BUCKET_COUNTS || 1000,
		NEXT_PUBLIC_ENABLE_DATASET_1_QUICKSEARCH: process.env.NEXT_PUBLIC_ENABLE_DATASET_1_QUICKSEARCH,

		// DATASET_2
		NEXT_PUBLIC_ARRANGER_DATASET_2_API: process.env.NEXT_PUBLIC_ARRANGER_DATASET_2_API,
		NEXT_PUBLIC_ARRANGER_DATASET_2_DOCUMENT_TYPE: process.env.NEXT_PUBLIC_ARRANGER_DATASET_2_DOCUMENT_TYPE,
		NEXT_PUBLIC_ARRANGER_DATASET_2_INDEX: process.env.NEXT_PUBLIC_ARRANGER_DATASET_2_INDEX,
		NEXT_PUBLIC_ARRANGER_DATASET_2_CARDINALITY_PRECISION_THRESHOLD:
			process.env.NEXT_PUBLIC_ARRANGER_DATASET_2_CARDINALITY_PRECISION_THRESHOLD || 3000,
		NEXT_PUBLIC_ARRANGER_DATASET_2_MANIFEST_COLUMNS: process.env.NEXT_PUBLIC_ARRANGER_DATASET_2_MANIFEST_COLUMNS || '',
		NEXT_PUBLIC_ARRANGER_DATASET_2_MAX_BUCKET_COUNTS:
			process.env.NEXT_PUBLIC_ARRANGER_DATASET_2_MAX_BUCKET_COUNTS || 1000,
		NEXT_PUBLIC_ENABLE_DATASET_2_QUICKSEARCH: process.env.NEXT_PUBLIC_ENABLE_DATASET_2_QUICKSEARCH,

		// Song
		NEXT_PUBLIC_SONG_API: process.env.NEXT_PUBLIC_SONG_API || 'http://localhost:8080',
		NEXT_PUBLIC_LYRIC_API: process.env.NEXT_PUBLIC_LYRIC_API || 'http://localhost:3030',
		NEXT_PUBLIC_LECTERN_API: process.env.NEXT_PUBLIC_LECTERN_API || 'http://localhost:3031',
		NEXT_PUBLIC_SCORE_API: process.env.NEXT_PUBLIC_SCORE_API || 'http://localhost:8087',

		// Auth & Keycloak
		NEXT_PUBLIC_AUTH_PROVIDER: process.env.NEXT_PUBLIC_AUTH_PROVIDER || 'keycloak',
		NEXT_PUBLIC_KEYCLOAK_HOST: process.env.NEXT_PUBLIC_KEYCLOAK_HOST || 'http://keycloak:8080',
		NEXT_PUBLIC_KEYCLOAK_REALM: process.env.NEXT_PUBLIC_KEYCLOAK_REALM || 'myrealm',
		NEXT_PUBLIC_KEYCLOAK_CLIENT_ID: process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID || 'webclient',
		NEXT_PUBLIC_KEYCLOAK_PERMISSION_AUDIENCE: process.env.NEXT_PUBLIC_KEYCLOAK_PERMISSION_AUDIENCE || 'dms',

		// using ASSET_PREFIX for the public runtime BASE_PATH because basePath in the top level config was not working
		// with the dms reverse proxy setup
		NEXT_PUBLIC_BASE_PATH: process.env.ASSET_PREFIX,
		NEXT_PUBLIC_DEBUG: process.env.NEXT_PUBLIC_DEBUG,
		NEXT_PUBLIC_LAB_NAME: process.env.NEXT_PUBLIC_LAB_NAME,
		NEXT_PUBLIC_LOGO_FILENAME: process.env.NEXT_PUBLIC_LOGO_FILENAME,
		NEXT_PUBLIC_SSO_PROVIDERS: process.env.NEXT_PUBLIC_SSO_PROVIDERS,
		NEXT_PUBLIC_UI_VERSION: process.env.npm_package_version,
		NEXT_PUBLIC_ENABLE_REGISTRATION: process.env.NEXT_PUBLIC_ENABLE_REGISTRATION,

		// Banner related configs
		NEXT_PUBLIC_SYSTEM_ALERTS: process.env.NEXT_PUBLIC_SYSTEM_ALERTS,

		// MOLECULAR
		NEXT_PUBLIC_ARRANGER_MOLECULAR_DATA_API: process.env.NEXT_PUBLIC_ARRANGER_MOLECULAR_DATA_API,
		NEXT_PUBLIC_ARRANGER_MOLECULAR_DATA_DOCUMENT_TYPE: process.env.NEXT_PUBLIC_ARRANGER_MOLECULAR_DATA_DOCUMENT_TYPE,
		NEXT_PUBLIC_ARRANGER_MOLECULAR_DATA_INDEX: process.env.NEXT_PUBLIC_ARRANGER_MOLECULAR_DATA_INDEX,
		NEXT_PUBLIC_ARRANGER_MOLECULAR_DATA_CARDINALITY_PRECISION_THRESHOLD:
			process.env.NEXT_PUBLIC_ARRANGER_MOLECULAR_DATA_CARDINALITY_PRECISION_THRESHOLD || 3000,
		NEXT_PUBLIC_ARRANGER_MANIFEST_COLUMNS: process.env.NEXT_PUBLIC_ARRANGER_MANIFEST_COLUMNS || '',
		NEXT_PUBLIC_ARRANGER_MOLECULAR_DATA_MAX_BUCKET_COUNTS:
			process.env.NEXT_PUBLIC_ARRANGER_MOLECULAR_DATA_MAX_BUCKET_COUNTS || 1000,
		NEXT_PUBLIC_ENABLE_MOLECULAR_QUICKSEARCH: process.env.NEXT_PUBLIC_ENABLE_MOLECULAR_QUICKSEARCH,
	},
	assetPrefix: process.env.ASSET_PREFIX || '',
	optimizeFonts: false,
	experimental: {
		esmExternals: 'loose',
	},
	async headers() {
		return [
			{
				source: '/api/:path*',
				headers: [
					{ key: 'Access-Control-Allow-Origin', value: '*' },
					{ key: 'Access-Control-Allow-Methods', value: 'GET,OPTIONS,PATCH,DELETE,POST,PUT' },
					{ key: 'Access-Control-Allow-Headers', value: '*' },
				],
			},
		];
	},

	async rewrites() {
		const isDocker = process.env.IS_DOCKER === 'true';
		return [
			{
				source: '/api/song/:path*',
				destination: isDocker ? 'http://song:8080/:path*' : 'http://localhost:8080/:path*',
			},
			{
				source: '/api/lyric/:path*',
				destination: isDocker ? 'http://lyric:3030/:path*' : 'http://localhost:3030/:path*',
			},
			{
				source: '/api/lectern/:path*',
				destination: isDocker ? 'http://lectern:3031/:path*' : 'http://localhost:3031/:path*',
			},
			{
				source: '/api/score/:path*',
				destination: isDocker ? 'http://score:8087/:path*' : 'http://localhost:8087/:path*',
			},
		];
	},
});
