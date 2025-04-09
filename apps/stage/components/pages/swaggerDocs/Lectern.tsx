import { css } from '@emotion/react';
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { SwaggerUIProps } from 'swagger-ui-react';
import 'swagger-ui-react/swagger-ui.css';
import PageLayout from '../../PageLayout';

const SwaggerUI = dynamic(() => import('swagger-ui-react'), {
	ssr: false,
});

// Import Type from swagger-ui-react or use a more compatible interface
// Note: In swagger-ui, a Request object has a url property but it's not strictly typed
type SwaggerRequest = {
	url: string;
	[key: string]: any;
};

type SwaggerResponse = {
	[key: string]: any;
};

const Lectern = () => {
	const [swaggerSpec, setSwaggerSpec] = useState<any>(null);
	const [error, setError] = useState<string | null>(null);
	const [swaggerUrl, setSwaggerUrl] = useState<string | null>(null);

	useEffect(() => {
		const tryFetchSwaggerSpec = async () => {
			// Try multiple possible paths for Swagger documentation
			const possiblePaths = [
				'/api/lectern/api-docs',
				'/api/lectern/swagger',
				'/api/lectern/docs',
				'/api/lectern/openapi',
				'/api/lectern/v2/api-docs',
			];

			// Try all paths until one works
			for (const path of possiblePaths) {
				try {
					console.log(`Attempting to fetch Swagger spec from: ${path}`);
					const response = await fetch(path);

					if (response.ok) {
						console.log(`Success fetching from: ${path}`);
						const data = await response.json();

						// Modify the spec to use our proxy
						const modifiedSpec = {
							...data,
							servers: [
								{
									url: '/api/lectern',
									description: 'Lectern API (Proxied)',
								},
							],
							// Ensure all paths start with our proxy path
							paths: Object.entries(data.paths || {}).reduce(
								(acc, [path, methods]) => ({
									...acc,
									[path.startsWith('/') ? path : `/${path}`]: methods,
								}),
								{},
							),
						};

						setSwaggerSpec(modifiedSpec);
						return; // Exit after successful fetch
					}
				} catch (err) {
					console.log(`Failed to fetch from ${path}:`, err);
				}
			}

			// If we get here, none of the paths worked - fall back to direct URL mode
			console.log('All fetch attempts failed, falling back to direct URL mode');
			setSwaggerUrl('/api/lectern/api-docs');

			// Only set error if we're not using fallback URL mode
			if (!swaggerUrl) {
				setError('Failed to load API documentation. The Lectern service may not be available.');
			}
		};

		tryFetchSwaggerSpec();
	}, [swaggerUrl]);

	// Use type assertion to make TypeScript happy
	const requestInterceptor = (req: any) => {
		console.log('Intercepting request:', req.url);

		// Check if the URL is already absolute (starts with http:// or https://)
		if (req.url.match(/^https?:\/\//)) {
			// Extract the path portion of the URL (everything after the domain)
			const urlObj = new URL(req.url);
			const pathWithQuery = urlObj.pathname + urlObj.search;

			// Replace the URL with our proxy path + the extracted path
			req.url = `/api/lectern${pathWithQuery.startsWith('/') ? '' : '/'}${pathWithQuery}`;
		}
		// For relative URLs, just prepend our proxy path if needed
		else if (!req.url.startsWith('/api/lectern')) {
			req.url = `/api/lectern${req.url.startsWith('/') ? '' : '/'}${req.url}`;
		}

		console.log('Modified request:', req.url);
		return req;
	};

	// Use type assertion to make TypeScript happy
	const responseInterceptor = (res: any) => {
		console.log('Response received:', res);
		return res;
	};

	const swaggerConfig: SwaggerUIProps = swaggerSpec
		? {
				// Use pre-fetched spec if available
				spec: swaggerSpec,
				docExpansion: 'none',
				filter: true,
				defaultModelExpandDepth: 1,
				plugins: [],
				presets: [],
				layout: 'BaseLayout',
				requestInterceptor,
				responseInterceptor,
		  }
		: {
				// Fallback to URL mode
				url: swaggerUrl || '/api/lectern/api-docs',
				docExpansion: 'none',
				filter: true,
				defaultModelExpandDepth: 1,
				plugins: [],
				presets: [],
				layout: 'BaseLayout',
				requestInterceptor,
				responseInterceptor,
		  };

	if (error && !swaggerUrl) {
		return (
			<PageLayout>
				<div css={containerStyle}>
					<div css={errorStyle}>
						{error}
						<div style={{ marginTop: '1rem' }}>
							<button
								onClick={() => {
									setError(null);
									setSwaggerUrl('/api/lectern/api-docs');
								}}
								style={{
									padding: '8px 16px',
									background: '#0B75A2',
									color: 'white',
									border: 'none',
									borderRadius: '4px',
									cursor: 'pointer',
									fontWeight: 'bold',
								}}
							>
								Try Direct Mode
							</button>
						</div>
					</div>
				</div>
			</PageLayout>
		);
	}

	if (!swaggerSpec && !swaggerUrl) {
		return (
			<PageLayout>
				<div css={containerStyle}>
					<div css={loadingStyle}>Loading API documentation...</div>
				</div>
			</PageLayout>
		);
	}

	return (
		<PageLayout>
			<div css={containerStyle}>
				<SwaggerUI {...swaggerConfig} />
			</div>
		</PageLayout>
	);
};

const containerStyle = css`
	padding: 20px;
	max-width: 1200px;
	margin: 0 auto;

	h1 {
		margin-bottom: 20px;
	}

	.swagger-ui {
		.info {
			margin: 20px 0;
		}

		.opblock {
			margin: 0 0 15px;
		}
	}
`;

const loadingStyle = css`
	text-align: center;
	padding: 2rem;
	font-size: 1.2rem;
	color: #666;
`;

const errorStyle = css`
	text-align: center;
	padding: 2rem;
	color: #dc3545;
	font-size: 1.2rem;
	background: #fff;
	border-radius: 4px;
	box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
`;

export default Lectern;
