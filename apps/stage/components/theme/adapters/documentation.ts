/*
 *
 * Copyright (c) 2024 The Ontario Institute for Cancer Research. All rights reserved
 *
 *  This program and the accompanying materials are made available under the terms of
 *  the GNU Affero General Public License v3.0. You should have received a copy of the
 *  GNU Affero General Public License along with this program.
 *   If not, see <http://www.gnu.org/licenses/>.
 *
 *  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY
 *  EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES
 *  OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT
 *  SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT,
 *  INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED
 *  TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS;
 *  OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER
 *  IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN
 *  ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 *
 */

import { StageThemeInterface } from '../index';

/**
 * Documentation Theme Adapter
 *
 * Transforms Stage theme into Documentation-specific theme structure.
 * Maintains the excellent Docusaurus-inspired structure while deriving
 * all colors from the core Stage theme palette.
 */
export const createDocumentationTheme = (stageTheme: StageThemeInterface) => {
	const { colors } = stageTheme;

	return {
		colors: {
			// Base colors
			background: colors.white,
			text: colors.black,
			textSecondary: colors.grey_5,
			textTertiary: colors.grey_3,

			// Primary palette - Blue
			primary: colors.secondary,
			primaryHover: colors.secondary_dark,
			primaryLight: colors.secondary_palest,
			primaryDark: colors.secondary,

			// Secondary palette - Teal/Green
			secondary: colors.success,
			secondaryHover: colors.success, // Using same as no darker variant exists
			secondaryLight: colors.success_light,
			secondaryDark: colors.success,

			// UI colors
			border: colors.grayscale_lighter,
			borderDark: colors.grey_3,
			divider: colors.grayscale_lightest,

			// Background variants
			backgroundSecondary: colors.grayscale_pale,
			backgroundTertiary: colors.grayscale_lightest,
			sidebar: colors.grayscale_pale,

			// Sidebar specific
			sidebarItemBackground: 'transparent',
			sidebarItemBackgroundActive: colors.secondary_palest,
			sidebarItemBackgroundHover: colors.secondary_palest,
			sidebarBorder: colors.grayscale_lighter,

			// Code and syntax
			codeBackground: colors.grayscale_lightest,
			codeInline: colors.accent2_dark,
			codeBorder: colors.grayscale_lighter,
			codeText: colors.secondary,
			linkText: colors.secondary,
			linkTextHover: colors.secondary_dark,

			// States
			success: colors.accent3_dark,
			warning: colors.accent3_lighter,
			error: colors.accent2_dark,
			info: colors.secondary_light,

			// Accent colors
			accent1: colors.accent1_dark,
			accent2: colors.accent2_dark,
			accent3: colors.accent3_dark,

			// Semantic colors
			white: colors.white,
			black: colors.black,

			// Legacy color mappings for compatibility
			primary_green: colors.accent3_dark,
			hover: colors.secondary_palest,
			grey_1: colors.grayscale_pale,
			grey_2: colors.grayscale_lightest,
			grey_3: colors.grayscale_lighter,
			grey_4: colors.grey_3,
			grey_5: colors.grey_5,
			grey_6: colors.black,
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
			base: '1.6',
			relaxed: '1.75',
		},

		// Content width
		maxWidth: '80ch',
		sidebarWidth: '300px',

		// Breakpoints
		breakpoints: {
			sm: '576px',
			md: '768px',
			lg: '992px',
			xl: '1200px',
			xxl: '1400px',
		},

		// Transitions
		transitions: {
			fast: 'all 0.15s ease-in-out',
			standard: 'all 0.25s ease-in-out',
			slow: 'all 0.3s ease-in-out',
		},

		// Shadows
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

		// Spacing system
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
};
