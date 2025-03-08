import { css } from '@emotion/react';
import theme from './theme';

const styles = {
	container: css`
		width: 100%;
		background: ${theme.colors.background};
		min-height: 100vh;
		font-family: ${theme.fonts.base};
		display: flex;
		flex-direction: column;
		margin: 0;
		padding: 0;
	`,

	contentWrapper: css`
		display: flex;
		width: 100%;
		flex: 1;
		position: relative;
		margin: 0;
		padding: 0;
		margin-top: 0;

		@media (max-width: ${theme.breakpoints.md}) {
			flex-direction: column;
			gap: 1rem;
		}
	`,

	sidebar: css`
		width: 280px;
		min-width: 280px;
		background: ${theme.colors.sidebar};
		border-right: 1px solid ${theme.colors.border};
		position: sticky; // This is the key property
		top: 0;
		height: 100vh; // Full viewport height
		overflow-y: auto;
		padding-top: 3.5rem;
		scrollbar-width: thin;
		scrollbar-color: ${theme.colors.primary} ${theme.colors.sidebar};
		flex-shrink: 0;
		align-self: flex-start;
		margin: 0;
		padding-left: 0;
		padding-right: 0;

		&::-webkit-scrollbar {
			width: 6px;
		}

		&::-webkit-scrollbar-track {
			background: ${theme.colors.sidebar};
		}

		&::-webkit-scrollbar-thumb {
			background-color: ${theme.colors.primary}80;
			border-radius: 6px;
		}

		@media (max-width: ${theme.breakpoints.md}) {
			position: relative;
			width: 100%;
			height: auto;
			top: 0;
			border-right: none;
			border-bottom: 1px solid ${theme.colors.border};
			padding: 0.5rem;
		}
	`,
	sidebarHeader: css`
		padding: 0 1.5rem 1rem;
		font-weight: 600;
		font-size: 0.875rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: ${theme.colors.textSecondary};

		@media (max-width: ${theme.breakpoints.md}) {
			display: none;
		}
	`,

	nav: css`
		ul {
			list-style: none;
			padding: 0 0.5rem;
			margin: 0;
		}

		li {
			margin: 0.5rem 0;
		}

		a {
			display: block;
			padding: 0.75rem 1rem;
			color: ${theme.colors.textSecondary};
			text-decoration: none;
			font-size: 0.875rem;
			border-radius: 0.375rem;
			transition: ${theme.transitions.standard};
			border-left: 2px solid transparent;

			&:hover {
				color: ${theme.colors.primary};
				background: ${theme.colors.hover};
			}

			&.active {
				color: ${theme.colors.primary};
				background: ${theme.colors.hover};
				font-weight: 500;
			}
		}

		@media (max-width: ${theme.breakpoints.md}) {
			ul {
				display: flex;
				flex-wrap: wrap;
				gap: 0.75rem;
				padding: 0.5rem;
			}

			li {
				margin: 0;
			}

			a {
				padding: 0.5rem 1rem;
				border: 1px solid ${theme.colors.border};
				border-radius: 2rem;
				white-space: nowrap;

				&.active {
					border: 1px solid ${theme.colors.primary};
					background: ${theme.colors.primaryLight};
					border-left: 1px solid ${theme.colors.primary};
				}
			}
		}
	`,

	main: css`
		flex: 1;
		padding: 4rem 4rem;
		overflow-x: hidden;
		max-width: calc(100% - 280px);

		@media (max-width: ${theme.breakpoints.md}) {
			padding: 2rem 1.5rem;
			max-width: 100%;
		}

		@media (max-width: ${theme.breakpoints.sm}) {
			padding: 1.5rem 1rem;
		}
	`,

	content: css`
		max-width: ${theme.maxWidth};
		margin: 0 auto; /* Keep auto for horizontal centering */
		margin-top: 0; /* Explicitly set top margin to 0 */
		padding-top: 0; /* Explicitly set top padding to 0 */
		font-size: 1rem;
		line-height: 1.8;
		color: ${theme.colors.text};

		h1,
		h2,
		h3,
		h4 {
			font-weight: 600;
			line-height: 1.3;
			margin: 2.5rem 0 1.5rem;
			scroll-margin-top: 2rem;
		}

		h1 {
			font-size: 2.5rem;
			border-bottom: 2px solid ${theme.colors.border};
			padding-bottom: 1rem;
			margin-top: 0;
		}

		h2 {
			font-size: 2rem;
			border-bottom: 1px solid ${theme.colors.border};
			padding-bottom: 0.75rem;
		}

		h3 {
			font-size: 1.75rem;
		}

		h4 {
			font-size: 1.5rem;
		}

		p,
		ul,
		ol {
			margin: 1.5rem 0;
		}

		ul,
		ol {
			padding-left: 2rem;
		}

		li {
			margin-bottom: 0.5rem;
		}

		a {
			color: ${theme.colors.primary};
			text-decoration: none;
			border-bottom: 1px solid transparent;
			transition: ${theme.transitions.standard};

			&:hover {
				border-bottom-color: ${theme.colors.primary};
			}
		}

		blockquote {
			margin: 2.5rem 0;
			padding: 1.5rem 2rem;
			border-left: 4px solid ${theme.colors.primary};
			background: ${theme.colors.hover};
			border-radius: 0.5rem;

			p {
				margin: 0;
				font-style: italic;
			}
		}

		table {
			width: 100%;
			margin: 2.5rem 0;
			border-collapse: separate;
			border-spacing: 0;
			font-size: 0.9375rem;
			overflow-x: auto;
			border: 1px solid ${theme.colors.border};
			border-radius: 0.5rem;

			th,
			td {
				padding: 1rem 1.5rem;
				text-align: left;
			}

			th {
				background: ${theme.colors.sidebar};
				border-bottom: 2px solid ${theme.colors.border};
			}

			td {
				border-bottom: 1px solid ${theme.colors.border};
			}

			tr:last-child td {
				border-bottom: none;
			}
		}

		pre,
		code {
			font-family: ${theme.fonts.mono};
			background: ${theme.colors.codeBackground};
			border-radius: 0.5rem;
			font-size: 0.9375rem;
		}

		pre {
			padding: 1.5rem;
			overflow-x: auto;
			border: 1px solid ${theme.colors.border};
			margin: 2rem 0;
			box-shadow: ${theme.boxShadow};

			code {
				background: none;
				padding: 0;
			}
		}

		code {
			padding: 0.2rem 0.4rem;
			border-radius: 0.25rem;
		}

		img {
			display: block;
			max-width: 100%;
			height: auto;
			margin: 2.5rem auto;
			border-radius: 0.5rem;
			box-shadow: ${theme.boxShadow};

			@media (max-width: ${theme.breakpoints.md}) {
				margin: 1.5rem 0;
			}
		}

		.mermaid {
			margin: 2.5rem auto;
			text-align: center;
		}
	`,

	loadingContainer: css`
		display: flex;
		justify-content: center;
		align-items: center;
		height: 300px;
		width: 100%;
	`,

	loader: css`
		border: 4px solid ${theme.colors.border};
		border-top: 4px solid ${theme.colors.primary};
		border-radius: 50%;
		width: 40px;
		height: 40px;
		animation: spin 1s linear infinite;

		@keyframes spin {
			0% {
				transform: rotate(0deg);
			}
			100% {
				transform: rotate(360deg);
			}
		}
	`,

	errorContainer: css`
		padding: 2rem;
		margin: 2rem 0;
		background-color: #fff5f5;
		border-left: 4px solid ${theme.colors.error};
		border-radius: 0.5rem;
		color: ${theme.colors.error};
	`,

	noContent: css`
		text-align: center;
		padding: 4rem 2rem;
		color: ${theme.colors.textSecondary};
	`,
};

export default styles;
