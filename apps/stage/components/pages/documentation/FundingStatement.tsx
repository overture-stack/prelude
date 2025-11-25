import { css, useTheme } from '@emotion/react';
import React, { useMemo } from 'react';
import { createDocumentationTheme } from '../../theme/adapters/documentation';
import { StageThemeInterface } from '../../theme';

const FundingStatement: React.FC = () => {
	const stageTheme = useTheme() as StageThemeInterface;
	const theme = createDocumentationTheme(stageTheme);
	const styles = useMemo(() => getStyles(theme), [theme]);

	return (
		<div css={styles.container}>
			<div css={styles.inner}>
				<h4 css={styles.title}>Supported by</h4>
				<p css={styles.text}>
					Grant #U24CA253529 from the National Cancer Institute at the US National Institutes of Health
				</p>
			</div>
		</div>
	);
};

const getStyles = (theme: ReturnType<typeof createDocumentationTheme>) => ({
	container: css`
		padding: ${theme.spacing[4]};
		background: linear-gradient(145deg, ${theme.colors.backgroundSecondary}, ${theme.colors.backgroundTertiary});
		border-top: 1px solid ${theme.colors.border};
		margin-top: auto;
	`,

	inner: css`
		position: relative;
	`,

	title: css`
		font-size: ${theme.fontSize.xs};
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin-bottom: ${theme.spacing[2]};
		color: ${theme.colors.primary};
		margin-top: 0;
	`,

	text: css`
		font-size: ${theme.fontSize.xs};
		line-height: ${theme.lineHeight.base};
		margin: 0;
		color: ${theme.colors.textSecondary};
	`,
});

export default FundingStatement;
