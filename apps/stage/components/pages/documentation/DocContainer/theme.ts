// DocsContainer/theme.ts
const theme = {
	colors: {
		background: '#ffffff',
		sidebar: '#f5f6f7',
		primary: '#0B75A2',
		primaryLight: '#e8f4f8',
		primary_green: '#043565',
		text: '#2d3748',
		textSecondary: '#4a5568',
		border: '#e2e8f0',
		hover: 'rgba(0, 168, 143, 0.08)',
		codeBackground: '#f7fafc',
		error: '#e53e3e',
		hero: '#0B75A2',
		white: '#ffffff',
	},
	fonts: {
		base: 'system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, sans-serif',
		mono: 'SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
		heading: 'system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, sans-serif',
	},
	maxWidth: '125ch',
	breakpoints: {
		xs: '480px',
		sm: '640px',
		md: '768px',
		lg: '1024px',
		xl: '1280px',
		xxl: '1536px',
	},
	transitions: {
		standard: 'all 0.2s ease-in-out',
		fast: 'all 0.1s ease-in-out',
		slow: 'all 0.3s ease-in-out',
	},
	boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
	boxShadowMd: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
	boxShadowLg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
	zIndices: {
		base: 0,
		content: 1,
		header: 10,
		sidebar: 20,
		overlay: 30,
		modal: 40,
		tooltip: 50,
	},
	spacing: {
		0: '0',
		1: '0.25rem', // 4px
		2: '0.5rem', // 8px
		3: '0.75rem', // 12px
		4: '1rem', // 16px
		5: '1.25rem', // 20px
		6: '1.5rem', // 24px
		8: '2rem', // 32px
		10: '2.5rem', // 40px
		12: '3rem', // 48px
		16: '4rem', // 64px
		20: '5rem', // 80px
		24: '6rem', // 96px
		32: '8rem', // 128px
	},
	borderRadius: {
		none: '0',
		sm: '0.125rem', // 2px
		default: '0.25rem', // 4px
		md: '0.375rem', // 6px
		lg: '0.5rem', // 8px
		xl: '0.75rem', // 12px
		'2xl': '1rem', // 16px
		'3xl': '1.5rem', // 24px
		full: '9999px',
	},
};

export default theme;
