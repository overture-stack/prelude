import { css } from '@emotion/react';
import theme from './theme';

const styles = {
	container: css`
		display: flex;
		width: 100%;
		height: 100%;
		position: relative;
		overflow: hidden;	const sidebarStyles = {
		width: '280px',
		minWidth: '280px',
		background: '#f5f6f7',
		borderRight: '1px solid #e2e8f0',
		position: 'fixed',
		left: '0',
		overflowY: 'auto',
		paddingTop: '1.5rem',
		paddingBottom: '2rem',
		zIndex: 10,
	} as const;
	`,

	contentWrapper: css`
		display: flex;
		width: 100%;
		max-width: 100%;
		position: relative;
		margin: 0;
		padding: 0;
		min-height: 100vh;

		@media (max-width: ${theme.breakpoints.md}) {
			flex-direction: column;
		}
	`,

	sidebar: css`
		width: 280px;
		min-width: 280px;
		background: ${theme.colors.sidebar};
		border-right: 1px solid ${theme.colors.border};
		position: fixed; // Changed to fixed
		left: 0;
		overflow-y: auto;
		padding-bottom: 2rem;
		z-index: 10;
		flex-shrink: 0;
		align-self: flex-start;

		/* Scrollbar styling */
		scrollbar-width: thin;
		scrollbar-color: ${theme.colors.primary} ${theme.colors.sidebar};

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

		/* Tablet-specific adjustments */
		@media (min-width: ${theme.breakpoints.md}) and (max-width: ${theme.breakpoints.lg}) {
			width: 240px;
			min-width: 240px;
		}

		/* Mobile adjustments */
		@media (max-width: ${theme.breakpoints.md}) {
			position: fixed; /* Fixed position for slide-out mobile menu */
			top: 0;
			left: 0;
			bottom: 0;
			transform: translateX(-100%);
			width: 85%;
			max-width: 300px;
			height: 100vh;
			box-shadow: 0 0 15px rgba(0, 0, 0, 0.1);
			padding-top: 1rem;
			transition: transform 0.3s ease;

			&.active {
				transform: translateX(0);
			}
		}
	`,

	sidebarToggle: css`
		display: none;
		position: fixed;
		bottom: 20px;
		right: 20px;
		background: ${theme.colors.primary};
		color: white;
		width: 50px;
		height: 50px;
		border-radius: 50%;
		border: none;
		box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
		z-index: 1001;
		cursor: pointer;
		align-items: center;
		justify-content: center;
		transition: ${theme.transitions.standard};

		&:hover {
			background: #09638a;
		}

		svg {
			width: 24px;
			height: 24px;
		}

		@media (max-width: ${theme.breakpoints.md}) {
			display: flex;
		}
	`,

	sidebarOverlay: css`
		display: none;
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.5);
		z-index: 999;
		opacity: 0;
		transition: opacity 0.3s ease;

		&.active {
			opacity: 1;
		}

		@media (max-width: ${theme.breakpoints.md}) {
			&.visible {
				display: block;
			}
		}
	`,

	sidebarHeader: css`
		padding: 0 1.5rem 1rem;
		font-weight: 600;
		font-size: 0.875rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: ${theme.colors.textSecondary};
		display: flex;
		justify-content: space-between;
		align-items: center;

		.close-button {
			display: none;
			background: transparent;
			border: none;
			color: ${theme.colors.textSecondary};
			cursor: pointer;
			padding: 5px;

			&:hover {
				color: ${theme.colors.primary};
			}

			svg {
				width: 20px;
				height: 20px;
			}
		}

		@media (max-width: ${theme.breakpoints.md}) {
			.close-button {
				display: block;
			}
		}
	`,

	nav: css`
		li {
			margin: 0.5rem 0;
		}

		a {
			display: block;
			padding: 0.75rem 1rem;
			color: ${theme.colors.primary_green};
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
				border-left-color: ${theme.colors.primary};
			}
		}

		@media (max-width: ${theme.breakpoints.md}) {
			li {
				margin: 0.25rem 0;
			}

			a {
				padding: 0.75rem 0.75rem;
			}
		}
	`,

	main: css`
		flex: 1;
		padding: 1.5rem 2.5rem 3rem;
		width: calc(100% - 280px);
		margin-left: 280px;
		box-sizing: border-box;
		padding-top: 1.5rem;
		margin-top: 120px;

		/* Tablet adjustments */
		@media (min-width: ${theme.breakpoints.md}) and (max-width: ${theme.breakpoints.lg}) {
			width: calc(100% - 240px);
			margin-left: 240px;
			padding: 1.5rem 1.5rem 3rem;
		}

		/* Mobile adjustments */
		@media (max-width: ${theme.breakpoints.md}) {
			width: 100%;
			margin-left: 0;
			padding: 1.5rem 1rem 3rem;
		}
	`,

	content: css`
		max-width: ${theme.maxWidth};
		margin: 0 auto;
		font-size: 1rem;
		line-height: 1.25;
		color: ${theme.colors.text};
		overflow-wrap: break-word;
		word-wrap: break-word;
		word-break: break-word; /* Only breaks words when necessary */
		hyphens: auto;

		/* Tablet-specific content adjustments */
		@media (min-width: ${theme.breakpoints.md}) and (max-width: ${theme.breakpoints.lg}) {
			padding-right: 1rem; /* Add some padding on the right for tablets */
			max-width: 100%;
			width: 100%;
		}

		/* Hide ID anchors in headings */
		h1 [id],
		h2 [id],
		h3 [id],
		h4 [id],
		h5 [id],
		h6 [id] {
			display: none;
		}

		/* Hide the {#id} part that might be in headings */
		h1::after,
		h2::after,
		h3::after,
		h4::after,
		h5::after,
		h6::after {
			content: '';
			display: none;
		}

		h1:first-of-type {
			visibility: hidden;
			height: 0;
			margin: 0;
			margin-top: -30px;
			padding: 0;
			line-height: 0;
			font-size: 0;
			border: none;
		}

		h1 {
			font-size: 32px;
			font-weight: 900;
			line-height: 60px;
			margin-bottom: 20px;
			border-bottom: 2px solid ${theme.colors.border};
			padding-bottom: 0.75rem;
			margin-top: 0;

			/* Tablet-specific heading size */
			@media (min-width: ${theme.breakpoints.md}) and (max-width: ${theme.breakpoints.lg}) {
				font-size: 1.9rem;
				padding-bottom: 0.5rem;
			}

			@media (max-width: ${theme.breakpoints.md}) {
				font-size: 1.75rem;
			}

			@media (max-width: ${theme.breakpoints.sm}) {
				font-size: 1.5rem;
			}
		}

		h2 {
			font-size: 24px;
			font-weight: 900;
			line-height: 40px;
			margin-bottom: 20px;
			border-bottom: 1px solid ${theme.colors.border};
			padding-bottom: 0.5rem;

			/* Tablet-specific heading size */
			@media (min-width: ${theme.breakpoints.md}) and (max-width: ${theme.breakpoints.lg}) {
				font-size: 1.6rem;
			}

			@media (max-width: ${theme.breakpoints.md}) {
				font-size: 1.5rem;
			}

			@media (max-width: ${theme.breakpoints.sm}) {
				font-size: 1.35rem;
			}
		}

		h3 {
			font-size: 18px;
			font-weight: 900;
			/* Tablet-specific heading size */
			@media (min-width: ${theme.breakpoints.md}) and (max-width: ${theme.breakpoints.lg}) {
				font-size: 1.4rem;
			}

			@media (max-width: ${theme.breakpoints.md}) {
				font-size: 1.35rem;
			}

			@media (max-width: ${theme.breakpoints.sm}) {
				font-size: 1.25rem;
			}
		}

		h4 {
			font-size: 16px;
			margin-bottom: 20px;
			/* Tablet-specific heading size */
			@media (min-width: ${theme.breakpoints.md}) and (max-width: ${theme.breakpoints.lg}) {
				font-size: 1.2rem;
			}

			@media (max-width: ${theme.breakpoints.md}) {
				font-size: 1.15rem;
			}

			@media (max-width: ${theme.breakpoints.sm}) {
				font-size: 1.1rem;
			}
		}

		details {
			background-color: ${theme.colors.hover};
			border: 1px solid ${theme.colors.border};
			border-radius: 0.5rem;
			padding: 0.75rem 1.25rem;
			margin: 1.5rem 0;
			transition: ${theme.transitions.standard};
			box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
		}
		
		details[open] {
			padding-bottom: 1rem;
		}
		
		summary {
			cursor: pointer;
			position: relative;
			padding: 0.5rem 0;
			font-weight: 600;
			list-style: none;
			outline: none;
			color: ${theme.colors.primary};
			display: flex;
			align-items: center;
			user-select: none;
		}
		
		summary:hover {
			color: ${theme.colors.primary_green};
		}
		
		summary::-webkit-details-marker {
			display: none;
		}
		
		summary::before {
			content: '';
			border-width: 0.4rem;
			border-style: solid;
			border-color: transparent transparent transparent ${theme.colors.primary};
			position: relative;
			display: inline-block;
			margin-right: 0.75rem;
			top: -1px;
			transition: transform 0.25s ease;
		}
		
		details[open] > summary::before {
			transform: rotate(90deg);
		}
		
		details > div,
		details > p,
		details > pre,
		details > ul,
		details > ol {
			margin-top: 1rem;
			padding-left: 1.25rem;
		}
		
		details code {
			background-color: rgba(0, 0, 0, 0.05);
		}

		p {
			line-height: 1.5;
			font-size: 16px;
			font-weight: 400;
		}
		,
		ul,
		ol {
			margin: 1.25rem 0;
			max-width: 100%;
			overflow-wrap: break-word;
			font-size: 16px;
		}

		ul,
		ol {
			padding-left: 2rem;

			@media (max-width: ${theme.breakpoints.sm}) {
				padding-left: 1.25rem;
			}
		}

		li {
			margin-bottom: 0.5rem;
		}

		a {
			color: ${theme.colors.primary_green};
			font-weight: 900;
			text-decoration: none;
			border-bottom: 1px solid transparent;
			transition: ${theme.transitions.standard};
			word-break: break-all; /* Allow links to break anywhere */

			&:hover {
				border-bottom-color: ${theme.colors.primary};
			}
		}

		blockquote {
			margin: 2rem 0;
			padding: 1.25rem 1.75rem;
			border-left: 4px solid ${theme.colors.primary};
			background: ${theme.colors.hover};
			border-radius: 0.5rem;

			@media (max-width: ${theme.breakpoints.sm}) {
				padding: 1rem 1.25rem;
				margin: 1.5rem 0;
			}

			p {
				margin: 0;
				font-style: italic;
			}
		}

		table {
			width: 100%;
			margin: 2rem 0;
			border-collapse: separate;
			border-spacing: 0;
			font-size: 0.9375rem;
			border: 1px solid ${theme.colors.border};
			border-radius: 0.5rem;
			display: block;
			overflow-x: auto;
			white-space: nowrap;

			@media (max-width: ${theme.breakpoints.md}) {
				margin: 1.5rem 0;
				font-size: 0.875rem;
			}

			th,
			td {
				padding: 0.875rem 1.25rem;
				text-align: left;

				@media (max-width: ${theme.breakpoints.sm}) {
					padding: 0.75rem 1rem;
				}
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
			background: ${theme.colors.primaryLight};
			border-radius: 0.5rem;
			font-size: 0.9375rem;
			line-height: 2;
			overflow-x: auto;

			@media (max-width: ${theme.breakpoints.md}) {
				font-size: 0.875rem;
			}
		}

		pre {
			padding: 1.25rem;
			overflow-x: auto;
			border: 1px solid ${theme.colors.border};
			margin: 1.5rem 0;
			box-shadow: ${theme.boxShadow};
			max-width: 100%;

			@media (max-width: ${theme.breakpoints.sm}) {
				padding: 1rem;
				margin: 1.25rem 0;
			}

			code {
				background: none;
				padding: 0;
			}
		}

		code {
			padding: 0.2rem 0.4rem;
			border-radius: 0.25rem;
			word-break: break-all;
		}

		img {
			display: block;
			max-width: 98%;
			height: auto;
			margin: 2rem auto;
			border-radius: 8px;
			box-shadow: ${theme.boxShadow};
			border: 10px solid transparent;

			@media (max-width: ${theme.breakpoints.md}) {
				margin: 1.5rem auto;
			}
		}
		strong {
			font-weight: 900;
			color: #000;
			letter-spacing: -0.02em;
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
		padding: 1.5rem;
		margin: 1.5rem 0;
		background-color: #fff5f5;
		border-left: 4px solid ${theme.colors.error};
		border-radius: 0.5rem;
		color: ${theme.colors.error};
	`,

	noContent: css`
		text-align: center;
		padding: 3rem 1.5rem;
		color: ${theme.colors.textSecondary};

		@media (max-width: ${theme.breakpoints.md}) {
			padding: 2rem 1rem;
		}
	`,

	toc: css`
		display: none;
		position: fixed;
		overflow-y: auto;
		padding-left: 2rem;
		width: 240px;
		font-size: 0.875rem;
		scrollbar-width: thin;
		scrollbar-color: ${theme.colors.primary} ${theme.colors.background};

		@media (min-width: 1200px) {
			display: block;
		}

		h4 {
			font-size: 0.875rem;
			text-transform: uppercase;
			letter-spacing: 0.05em;
			color: ${theme.colors.textSecondary};
			margin: 0 0 1rem;
		}

		ul {
			list-style: none;
			padding: 0;
			margin: 0;
		}

		li {
			margin-bottom: 0.5rem;
			padding-left: 1rem;
			border-left: 2px solid ${theme.colors.border};
		}

		li.active {
			border-left: 2px solid ${theme.colors.primary};
		}

		a {
			color: ${theme.colors.textSecondary};
			text-decoration: none;
			display: block;
			padding: 0.25rem 0;
			font-size: 0.8125rem;
			transition: ${theme.transitions.standard};

			&:hover,
			&.active {
				color: ${theme.colors.primary};
			}
		}
	`,

	tableOfContentsToggle: css`
		display: none;
		position: fixed;
		bottom: 20px;
		right: 80px;
		background: ${theme.colors.primary};
		color: white;
		width: 50px;
		height: 50px;
		border-radius: 50%;
		border: none;
		box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
		z-index: 1001;
		cursor: pointer;
		align-items: center;
		justify-content: center;
		transition: ${theme.transitions.standard};

		&:hover {
			background: #09638a;
		}

		svg {
			width: 24px;
			height: 24px;
		}

		@media (min-width: ${theme.breakpoints.md}) and (max-width: 1200px) {
			display: flex;
		}
	`,

	tocSidebar: css`
		display: none;
		position: fixed;
		top: 0;
		right: 0;
		width: 85%;
		max-width: 300px;
		height: 100vh;
		background: ${theme.colors.background};
		border-left: 1px solid ${theme.colors.border};
		z-index: 1000;
		padding: 1rem;
		transform: translateX(100%);
		transition: transform 0.3s ease-in-out;
		overflow-y: auto;

		&.active {
			transform: translateX(0);
		}

		@media (min-width: ${theme.breakpoints.md}) and (max-width: 1200px) {
			display: block;
		}
	`,

	breadcrumbs: css`
		display: flex;
		flex-wrap: wrap;
		margin-bottom: 1rem;
		font-size: 0.875rem;
		color: ${theme.colors.textSecondary};

		a {
			color: ${theme.colors.textSecondary};
			text-decoration: none;
			transition: ${theme.transitions.standard};

			&:hover {
				color: ${theme.colors.primary};
			}
		}

		span {
			display: inline-flex;
			align-items: center;

			&:not(:last-child)::after {
				content: '/';
				padding: 0 0.5rem;
				color: ${theme.colors.border};
			}
		}
	`,

	docHeader: css`
		margin-bottom: 2rem;
		width: 100%;
		max-width: 100%;

		@media (max-width: ${theme.breakpoints.md}) {
			margin-bottom: 1.5rem;
		}
	`,

	docFooter: css`
		display: flex;
		justify-content: space-between;
		margin-top: 3rem;
		padding-top: 1.5rem;
		border-top: 1px solid ${theme.colors.border};
		width: 100%;

		@media (max-width: ${theme.breakpoints.sm}) {
			flex-direction: column;
			gap: 1rem;
		}

		a {
			display: inline-flex;
			align-items: center;
			color: ${theme.colors.primary};
			text-decoration: none;
			font-weight: 500;
			transition: ${theme.transitions.standard};

			&:hover {
				color: #09638a;
			}

			svg {
				width: 20px;
				height: 20px;
				flex-shrink: 0;
			}
		}

		.prev-link svg {
			margin-right: 0.5rem;
		}

		.next-link svg {
			margin-left: 0.5rem;
		}

		.next-link {
			text-align: right;
		}

		@media (max-width: ${theme.breakpoints.sm}) {
			.next-link {
				text-align: left;
			}
		}
	`,

	sectionNav: css`
		display: flex;
		justify-content: space-between;
		margin-top: 3rem;
		padding-top: 1.5rem;
		border-top: 1px solid ${theme.colors.border};

		@media (max-width: ${theme.breakpoints.sm}) {
			flex-direction: column;
			gap: 1rem;
		}
	`,
};

export default styles;
