import { css } from '@emotion/react';
import React from 'react';
import theme from './shared/theme';

const FundingStatement: React.FC = () => (
	<div css={fundingStatementStyle}>
		<div css={fundingStatementInnerStyle}>
			<h4 css={fundingStatementTitleStyle}>Supported by</h4>
			<p css={fundingStatementTextStyle}>
				Grant #U24CA253529 from the National Cancer Institute at the US National Institutes of Health
			</p>
		</div>
	</div>
);

const fundingStatementStyle = css`
	padding: ${theme.spacing[4]};
	background: linear-gradient(145deg, ${theme.colors.backgroundSecondary}, ${theme.colors.backgroundTertiary});
	border-top: 1px solid ${theme.colors.border};
	margin-top: auto; /* Push to bottom */
`;

const fundingStatementInnerStyle = css`
	position: relative;
`;

const fundingStatementTitleStyle = css`
	font-size: ${theme.fontSize.xs};
	font-weight: 600;
	text-transform: uppercase;
	letter-spacing: 0.05em;
	margin-bottom: ${theme.spacing[2]};
	color: ${theme.colors.primary};
	margin-top: 0;
`;

const fundingStatementTextStyle = css`
	font-size: ${theme.fontSize.xs};
	line-height: ${theme.lineHeight.base};
	margin: 0;
	color: ${theme.colors.textSecondary};
`;

export default FundingStatement;
