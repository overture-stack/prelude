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

	useEffect(() => {
		const fetchSwaggerSpec = async () => {
			try {
				// Try to fetch directly from Lyric service first
				const response = await fetch('/api/lyric/api-docs'); // TODO update lyric or find url with spec

				console.log('Response status:', response.status);

				if (!response.ok) {
					throw new Error(`HTTP error! status: ${response.status}`);
				}

				const data = await response.json();
				console.log('Received Swagger spec:', data);

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
					paths: Object.entries(data.paths).reduce(
						(acc, [path, methods]) => ({
							...acc,
							[path.startsWith('/') ? path : `/${path}`]: methods,
						}),
						{},
					),
				};

				setSwaggerSpec(modifiedSpec);
			} catch (err) {
				console.error('Failed to fetch Swagger spec:', err);
				setError('Failed to load API documentation. Please try again later.');
			}
		};

		fetchSwaggerSpec();
	}, []);

	const swaggerConfig: SwaggerUIProps = {
		spec: swaggerSpec,
		docExpansion: 'none',
		filter: true,
		defaultModelExpandDepth: 1,
		plugins: [],
		presets: [],
		layout: 'BaseLayout',
		requestInterceptor: (req) => {
			console.log('Intercepting request:', req.url);
			// Ensure all requests go through our proxy
			if (!req.url.startsWith('/api/lyric')) {
				req.url = `/api/lyric${req.url.startsWith('/') ? '' : '/'}${req.url}`;
			}
			console.log('Modified request:', req.url);
			return req;
		},
		responseInterceptor: (res) => {
			console.log('Response received:', res);
			return res;
		},
	};

	if (error) {
		return (
			<PageLayout>
				<div css={containerStyle}>
					<div css={errorStyle}>{error}</div>
				</div>
			</PageLayout>
		);
	}

	if (!swaggerSpec) {
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

export default Lyric;
