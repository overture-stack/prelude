// DocContainer/theme.ts
const theme = {
	colors: {
		// Base colors
		background: '#ffffff',
		text: '#282A35', // Dark grayscale
		textSecondary: '#5E6068', // Medium grayscale
		textTertiary: '#A6AFB3', // Light grayscale

		// Primary palette - Blue
		primary: '#0B75A2', // Primary blue
		primaryHover: '#109ED9', // Lighter blue on hover
		primaryLight: '#EDF9FD', // Lightest blue background
		primaryDark: '#0B75A2', // Keep same as primary

		// Secondary palette - Teal/Green
		secondary: '#00A88F', // Secondary teal
		secondaryHover: '#00C4A7', // Lighter teal on hover
		secondaryLight: '#E5FBF8', // Lightest teal background
		secondaryDark: '#00A88F', // Keep same as secondary

		// UI colors
		border: '#DFDFE1', // Light grayscale
		borderDark: '#A6AFB3', // Medium grayscale
		divider: '#F2F3F5', // Very light grayscale

		// Background variants
		backgroundSecondary: '#F2F5F8', // Lightest grayscale
		backgroundTertiary: '#F2F3F5', // Very light grayscale
		sidebar: '#F2F5F8', // Lightest grayscale

		// Sidebar specific
		sidebarItemBackground: 'transparent',
		sidebarItemBackgroundActive: '#EDF9FD', // Light blue
		sidebarItemBackgroundHover: '#EDF9FD', // Light blue
		sidebarBorder: '#DFDFE1',

		// Code and syntax
		codeBackground: '#F2F3F5', // Very light grayscale
		codeInline: '#9E005D', // Accent 2 purple
		codeBorder: '#DFDFE1',
		codeText: '#0B75A2', // Primary blue
		linkText: '#0B75A2', // Primary blue
		linkTextHover: '#109ED9', // Lighter blue

		// States
		success: '#CFD509', // Accent 3 yellow-green
		warning: '#F0F2B0', // Light yellow-green
		error: '#9E005D', // Accent 2 purple
		info: '#4BC4F0', // Secondary light blue

		// Accent colors
		accent1: '#003055', // Navy blue
		accent2: '#9E005D', // Purple
		accent3: '#CFD509', // Yellow-green

		// Semantic colors
		white: '#ffffff',
		black: '#282A35',

		// Legacy color mappings for compatibility
		primary_green: '#CFD509', // Map to accent 3
		hover: '#EDF9FD', // Light blue
		grey_1: '#F2F5F8', // Lightest grayscale
		grey_2: '#F2F3F5', // Very light grayscale
		grey_3: '#DFDFE1', // Light grayscale
		grey_4: '#A6AFB3', // Medium grayscale
		grey_5: '#5E6068', // Dark grayscale
		grey_6: '#282A35', // Darkest grayscale
	},
	// Typography
	fonts: {
		base: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',
		mono: 'SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
		heading:
			'-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',
	},

	// Typography scale
	fontSize: {
		xs: '0.75rem', // 12px
		sm: '0.875rem', // 14px
		base: '1rem', // 16px
		lg: '1.125rem', // 18px
		xl: '1.25rem', // 20px
		'2xl': '1.5rem', // 24px
		'3xl': '1.875rem', // 30px
		'4xl': '2.25rem', // 36px
		'5xl': '3rem', // 48px
	},

	// Line heights
	lineHeight: {
		tight: '1.25',
		base: '1.6', //  1.6 for content
		relaxed: '1.75',
	},

	// Content width
	maxWidth: '80ch', // 80ch for content
	sidebarWidth: '300px', // sidebar width

	// Breakpoints -
	breakpoints: {
		sm: '576px',
		md: '768px',
		lg: '992px', // Docusaurus main breakpoint
		xl: '1200px',
		xxl: '1400px',
	},

	// Transitions - Smoother
	transitions: {
		fast: 'all 0.15s ease-in-out',
		standard: 'all 0.25s ease-in-out',
		slow: 'all 0.3s ease-in-out',
	},
	// Shadows - (more subtle)
	boxShadow: {
		sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
		base: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
		md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
		lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
		none: 'none',
	},

	// Z-indices
	zIndices: {
		base: 0,
		content: 1,
		header: 10,
		sidebar: 20,
		footer: 25,
		overlay: 30,
		modal: 40,
		tooltip: 50,
	},

	// Spacing system - Docusaurus inspired (8px base unit)
	spacing: {
		0: '0',
		0.5: '0.125rem', // 2px
		1: '0.25rem', // 4px
		1.5: '0.375rem', // 6px
		2: '0.5rem', // 8px
		2.5: '0.625rem', // 10px
		3: '0.75rem', // 12px
		3.5: '0.875rem', // 14px
		4: '1rem', // 16px
		5: '1.25rem', // 20px
		6: '1.5rem', // 24px
		7: '1.75rem', // 28px
		8: '2rem', // 32px
		9: '2.25rem', // 36px
		10: '2.5rem', // 40px
		11: '2.75rem', // 44px
		12: '3rem', // 48px
		14: '3.5rem', // 56px
		16: '4rem', // 64px
		20: '5rem', // 80px
		24: '6rem', // 96px
		28: '7rem', // 112px
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
