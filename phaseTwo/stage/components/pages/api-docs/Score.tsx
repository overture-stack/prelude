import dynamic from 'next/dynamic';
import { css } from '@emotion/react';
import PageLayout from '../../PageLayout';
import 'swagger-ui-react/swagger-ui.css';
import { getConfig } from '@/global/config';
import { SwaggerUIProps } from 'swagger-ui-react';

const SwaggerUI = dynamic(() => import('swagger-ui-react'), { 
  ssr: false 
});

const Score = () => {
  const { NEXT_PUBLIC_SCORE_API } = getConfig();

  const swaggerConfig: SwaggerUIProps = {
    url: `/api/Score/v2/api-docs`,
    docExpansion: 'none',
    filter: true,
    defaultModelExpandDepth: 1,
    plugins: [],
    presets: [],
    layout: "BaseLayout"
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

export default Score;