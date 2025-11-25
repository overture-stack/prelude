import { css } from '@emotion/react';
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { SwaggerUIProps } from 'swagger-ui-react';
import 'swagger-ui-react/swagger-ui.css';
import PageLayout from '../../PageLayout';

const SwaggerUI = dynamic(() => import('swagger-ui-react'), {
	ssr: false,
});

const Lyric = () => {
	const [swaggerSpec, setSwaggerSpec] = useState<any>(null);
	const [error, setError] = useState<string | null>(null);
	const [swaggerUrl, setSwaggerUrl] = useState<string | null>(null);
	const [debugInfo, setDebugInfo] = useState<string[]>([]);
	const [showDebug, setShowDebug] = useState<boolean>(false);

	const addDebugInfo = (info: string) => {
		console.log('Debug:', info);
		setDebugInfo((prev) => [...prev, info]);
	};

	useEffect(() => {
		const tryFetchSwaggerSpec = async () => {
			// Try multiple possible paths for Swagger documentation
			const possiblePaths = [
				'/api/lyric/api-docs',
				'/api/lyric/swagger',
				'/api/lyric/docs',
				'/api/lyric/openapi',
				'/api/lyric/v2/api-docs',
			];

			addDebugInfo(`Starting fetch attempts at ${new Date().toISOString()}`);

			// Try all paths until one works
			for (const path of possiblePaths) {
				try {
					addDebugInfo(`Attempting to fetch from: ${path}`);
					const response = await fetch(path);

					addDebugInfo(`Response from ${path}: status ${response.status}`);

					if (response.ok) {
						addDebugInfo(`Success fetching from: ${path}`);
						const data = await response.json();
						addDebugInfo(`Parsed JSON data successfully`);

						// Modify the spec to use our proxy
						const modifiedSpec = {
							...data,
							servers: [
								{
									url: '/api/lyric',
									description: 'Lyric API (Proxied)',
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
					addDebugInfo(`Error fetching from ${path}: ${err instanceof Error ? err.message : String(err)}`);
				}
			}

			// If we get here, none of the paths worked
			addDebugInfo('All fetch attempts failed, falling back to direct URL mode');
			setSwaggerUrl('/api/lyric/api-docs');

			// Only set error if we're not using fallback URL mode
			if (!swaggerUrl) {
				setError('Failed to load API documentation. The Lyric service may not be available.');
			}
		};

		tryFetchSwaggerSpec();
	}, [swaggerUrl]);

	// Use type 'any' to avoid TypeScript errors with swagger-ui-react types
	const requestInterceptor = (req: any) => {
		console.log('Intercepting request:', req.url);
		addDebugInfo(`Intercepting request: ${req.url}`);

		// Check if the URL is already absolute (starts with http:// or https://)
		if (req.url.match(/^https?:\/\//)) {
			// Extract the path portion of the URL (everything after the domain)
			const urlObj = new URL(req.url);
			const pathWithQuery = urlObj.pathname + urlObj.search;

			// Replace the URL with our proxy path + the extracted path
			req.url = `/api/lyric${pathWithQuery.startsWith('/') ? '' : '/'}${pathWithQuery}`;
		}
		// For relative URLs, just prepend our proxy path if needed
		else if (!req.url.startsWith('/api/lyric')) {
			req.url = `/api/lyric${req.url.startsWith('/') ? '' : '/'}${req.url}`;
		}

		addDebugInfo(`Modified request to: ${req.url}`);
		return req;
	};

	// Use type 'any' to avoid TypeScript errors with swagger-ui-react types
	const responseInterceptor = (res: any) => {
		console.log('Response received:', res);

		// Add response info to debug log if possible
		try {
			if (res && res.status) {
				addDebugInfo(`Response received: status ${res.status}`);
			} else {
				addDebugInfo(`Response received (no status available)`);
			}
		} catch (e) {
			addDebugInfo(`Error logging response: ${e instanceof Error ? e.message : String(e)}`);
		}

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
				url: swaggerUrl || '/api/lyric/api-docs',
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
									setSwaggerUrl('/api/lyric/api-docs');
								}}
								style={{
									padding: '8px 16px',
									background: '#0B75A2',
									color: 'white',
									border: 'none',
									borderRadius: '4px',
									cursor: 'pointer',
									fontWeight: 'bold',
									marginRight: '10px',
								}}
							>
								Try Direct Mode
							</button>
							<button
								onClick={() => setShowDebug((prev) => !prev)}
								style={{
									padding: '8px 16px',
									background: '#555',
									color: 'white',
									border: 'none',
									borderRadius: '4px',
									cursor: 'pointer',
									fontWeight: 'bold',
								}}
							>
								{showDebug ? 'Hide Debug Info' : 'Show Debug Info'}
							</button>
						</div>
					</div>

					{showDebug && (
						<div css={debugStyle}>
							<h3>Debug Information:</h3>
							<p>Lyric service should be running at http://localhost:3030 (check env config)</p>
							<p>
								To access Swagger directly, try:{' '}
								<a href="http://localhost:3030/api-docs" target="_blank" rel="noopener noreferrer">
									http://localhost:3030/api-docs
								</a>
							</p>
							<hr />
							<button
								onClick={() => {
									// Test the proxy directly
									fetch('/api/lyric/')
										.then((res) => {
											addDebugInfo(`Direct fetch to /api/lyric/: status ${res.status}`);
										})
										.catch((err) => {
											addDebugInfo(`Error in direct fetch to /api/lyric/: ${err.message}`);
										});
								}}
								style={{
									padding: '8px 16px',
									background: '#333',
									color: 'white',
									border: 'none',
									borderRadius: '4px',
									cursor: 'pointer',
									marginBottom: '10px',
								}}
							>
								Test Direct Proxy Call
							</button>
							<div style={{ maxHeight: '300px', overflow: 'auto', background: '#f3f3f3', padding: '10px' }}>
								{debugInfo.map((info, index) => (
									<div key={index} style={{ fontFamily: 'monospace', fontSize: '12px', marginBottom: '5px' }}>
										{info}
									</div>
								))}
							</div>
						</div>
					)}
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
				<div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
					<button
						onClick={() => setShowDebug((prev) => !prev)}
						style={{
							padding: '8px 16px',
							background: '#555',
							color: 'white',
							border: 'none',
							borderRadius: '4px',
							cursor: 'pointer',
							fontWeight: 'bold',
						}}
					>
						{showDebug ? 'Hide Debug Info' : 'Show Debug Info'}
					</button>
				</div>

				{showDebug && (
					<div css={debugStyle}>
						<h3>Debug Information:</h3>
						<div style={{ maxHeight: '200px', overflow: 'auto', background: '#f3f3f3', padding: '10px' }}>
							{debugInfo.map((info, index) => (
								<div key={index} style={{ fontFamily: 'monospace', fontSize: '12px', marginBottom: '5px' }}>
									{info}
								</div>
							))}
						</div>
					</div>
				)}

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
	margin-bottom: 20px;
`;

const debugStyle = css`
	margin-top: 20px;
	margin-bottom: 20px;
	padding: 15px;
	background: #f9f9f9;
	border: 1px solid #ddd;
	border-radius: 4px;
`;

export default Lyric;
