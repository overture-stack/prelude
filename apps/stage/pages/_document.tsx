import { Html, Head, Main, NextScript } from 'next/document';
import urlJoin from 'url-join';

import { getConfig } from '../global/config';

const Document = () => {
	const { NEXT_PUBLIC_BASE_PATH } = getConfig();

	return (
		<Html>
			<Head>
				<link rel="preconnect" href="https://fonts.googleapis.com" />
				<link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
				<link
					href="https://fonts.googleapis.com/css2?family=Lato:wght@300;400;600&amp;display=swap"
					rel="stylesheet"
				/>
				<link rel="shortcut icon" href={urlJoin(NEXT_PUBLIC_BASE_PATH, '/images/favicon.ico')} />
			</Head>
			<body>
				<Main />
				<NextScript />
			</body>
		</Html>
	);
};

export default Document;
