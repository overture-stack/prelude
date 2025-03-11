// PageLayout.tsx - Updated component with width consistency fixes
import { css } from '@emotion/react';
import { ReactNode } from 'react';

import ErrorNotification from './ErrorNotification';
import Footer from './Footer';
import PageHead from './Head';
import NavBar from './NavBar/NavBar';

const PageLayout = ({ children, subtitle }: { children: ReactNode; subtitle?: string }) => {
	return (
		<>
			<PageHead subtitle={subtitle}></PageHead>
			<div
				css={(theme) => css`
					display: flex;
					flex-direction: column;
					min-height: 100vh;
					${theme.typography.regular}
					color: ${theme.colors.black};
					width: 100%;
					max-width: 100%;
					overflow-x: hidden;
					padding-top: ${theme.dimensions.navbar.height}px;
				`}
			>
				<NavBar />
				<div
					css={css`
						flex: 1;
						display: flex;
						flex-direction: column;
						width: 100%;
						max-width: 100%;
					`}
				>
					{children}
				</div>
				<Footer />
			</div>
		</>
	);
};

export const ErrorPageLayout = ({
	children,
	subtitle,
	errorTitle,
}: {
	children: ReactNode;
	subtitle: string;
	errorTitle: string;
}) => {
	return (
		<PageLayout subtitle={subtitle}>
			<ErrorNotification
				size="lg"
				title={errorTitle}
				css={css`
					flex-direction: column;
					justify-content: center;
					align-items: center;
				`}
			>
				{children}
			</ErrorNotification>
		</PageLayout>
	);
};
export default PageLayout;
