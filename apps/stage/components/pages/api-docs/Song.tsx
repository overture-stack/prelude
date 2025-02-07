import { css } from '@emotion/react';
import dynamic from 'next/dynamic';
import { SwaggerUIProps } from 'swagger-ui-react';
import 'swagger-ui-react/swagger-ui.css';
import PageLayout from '../../PageLayout';

const SwaggerUI = dynamic(() => import('swagger-ui-react'), {
	ssr: false,
});

const Song = () => {
	const swaggerConfig: SwaggerUIProps = {
		url: `/api/song/v2/api-docs`,
		docExpansion: 'none',
		filter: true,
		defaultModelExpandDepth: 1,
		plugins: [],
		presets: [],
		layout: 'BaseLayout',
		requestInterceptor: (req) => {
			// Always use the Next.js proxy route
			if (req.url.startsWith('http')) {
				const url = new URL(req.url);
				req.url = `${url.pathname}${url.search}`;
			}
			return req;
		},
		// Add CORS headers to the Swagger UI requests
		responseInterceptor: (response) => {
			if (response.headers) {
				response.headers['Access-Control-Allow-Origin'] = '*';
			}
			return response;
		},
	};

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
`;

export default Song;
