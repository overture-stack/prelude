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

import { css } from '@emotion/react';
import { StageThemeInterface } from '../index';

/**
 * Lectern Theme Adapter
 *
 * Transforms Stage theme into Lectern-compatible theme structure for the Data Dictionary viewer.
 *
 * KEY UI MAPPINGS:
 *
 * COLORS (most used):
 * - accent_dark → Dictionary header text, button text, icons
 * - accent_1 → Button hover states, conditional block backgrounds
 * - background_light → Button backgrounds
 * - background_alternate → Alternating table rows
 * - border_light → Table borders
 * - border_button → Button borders
 * - white/black → Base backgrounds and text
 *
 * TYPOGRAPHY (most used):
 * - subtitleBold → Dictionary title
 * - paragraphSmall → Table cells, field descriptions
 * - paragraphSmallBold → Attribute headers, labels
 * - body/bodyBold → Description text
 * - data/dataBold → Monospace field values
 * - buttonText → All buttons
 * - fieldBlock → Field names in monospace blocks
 * - tableHeader → Table column headers
 *
 * SHADOW: subtle (table scrolling), accordion (dropdown shadows)
 * DIMENSIONS: Available for layout calculations
 * ICONS: Can be overridden by adding an `icons` property
 */
export const createLecternTheme = (stageTheme: StageThemeInterface) => {
	const { colors, typography, shadow, dimensions } = stageTheme;

	return {
		colors: {
			gradients: {
				skeleton: (accentColor: string) =>
					`linear-gradient(90deg, ${colors.grey_1} 0%, ${accentColor} 50%, ${colors.grey_1} 100%)`,
			},

			// Accent colors - Primary interactive elements
			accent: colors.primary, // Loading spinner
			accent_light: colors.primary_light,
			accent_dark: colors.primary_dark, // Header text, button text, icons
			accent_1: colors.primary_palest, // Button hover states

			// Secondary accents
			accent2: colors.accent2,
			accent2_dark: colors.accent2_dark,
			accent2_light: colors.accent2_light,
			accent3: colors.accent3_dark,

			// Brand colors
			primary: colors.primary,
			primary_dark: colors.primary_dark,
			secondary: colors.secondary,
			secondary_light: colors.secondary_light,
			secondary_dark: colors.secondary_dark,
			secondary_accessible: colors.secondary,
			secondary_1: colors.secondary_lightest,
			secondary_2: colors.secondary_light,

			// Backgrounds
			background_light: colors.white, // Buttons, dropdowns
			background_muted: colors.grayscale_lighter,
			background_alternate: colors.grayscale_lightest, // Alternating table rows
			background_overlay: colors.black, // Modal overlay
			background_pill: colors.grayscale_lightest,
			background_pill_hover: colors.secondary_palest,

			// Borders
			border_light: colors.grayscale_lighter, // Table borders
			border_medium: colors.grayscale_lighter, // Table header border
			border_subtle: colors.grey_2,
			border_muted: colors.grayscale_lightest, // Toolbar borders
			border_button: colors.primary, // Button borders

			// Semantic colors
			error: colors.accent2_dark,
			error_dark: colors.error_dark, // Error text
			error_1: colors.error_1,
			error_2: colors.error_2,
			error_modal_bg: colors.error_light, // Error modal background
			warning: colors.accent3_dark,
			warning_dark: colors.warning_dark,

			// Base colors
			white: colors.white,
			black: colors.black,

			// Greyscale
			grey_1: colors.grey_1,
			grey_2: colors.grey_2,
			grey_3: colors.grey_3, // Table container border
			grey_4: colors.grey_3,
			grey_5: colors.grey_5,
			grey_6: colors.black,
			grey_highlight: colors.grey_highlight,
		},

		typography: {
			hero: css`
				font-family: ${typography.heading};
				font-size: 36px;
				font-weight: bold;
				line-height: 120%;
			`,
			title: css`
				font-family: ${typography.heading};
				font-size: 32px;
				font-weight: bold;
				line-height: 120%;
			`,
			subtitle: css`
				font-family: ${typography.regular};
				font-size: 28px;
				line-height: 130%;
			`,
			subtitleBold: css`
				font-family: ${typography.heading};
				font-size: 30px;
				font-weight: bold;
				line-height: 100%;
			`, // Dictionary title
			subtitleSecondary: css`
				font-family: ${typography.subheading};
				font-size: 24px;
				line-height: 130%;
			`,
			headingSmall: css`
				font-family: ${typography.subheading};
				font-size: 22px;
				font-weight: bold;
				line-height: 120%;
			`,
			introText: css`
				font-family: ${typography.regular};
				font-size: 20px;
				line-height: 150%;
			`,
			introTextBold: css`
				font-family: ${typography.heading};
				font-size: 20px;
				font-weight: bold;
				line-height: 150%;
			`,
			regular: typography.regular,
			paragraph: css`
				font-family: ${typography.regular};
				font-size: 18px;
				line-height: 150%;
			`,
			paragraphBold: css`
				font-family: ${typography.heading};
				font-size: 18px;
				font-weight: bold;
				line-height: 130%;
			`,
			paragraphSmall: css`
				font-family: ${typography.regular};
				font-size: 14px;
				line-height: 140%;
			`, // Table cells, descriptions
			paragraphSmallBold: css`
				font-family: ${typography.label};
				font-size: 16px;
				font-weight: bold;
				line-height: 140%;
			`, // Attribute headers, labels
			body: css`
				font-family: ${typography.regular};
				font-size: 16px;
				line-height: 150%;
			`, // Description text
			bodyBold: css`
				font-family: ${typography.heading};
				font-size: 16px;
				font-weight: bold;
				line-height: 150%;
			`,
			data: typography.data, // Monospace field values
			dataBold: css`
				${typography.data}
				font-weight: bold;
			`,
			caption: css`
				font-family: ${typography.label2};
				font-size: 12px;
				line-height: 140%;
			`,
			captionBold: css`
				font-family: ${typography.label};
				font-size: 12px;
				font-weight: bold;
				line-height: 140%;
			`, // Small pills
			buttonText: css`
				font-family: ${typography.button};
				font-size: 16px;
				line-height: 1.5;
				vertical-align: middle;
			`, // All buttons
			fieldBlock: css`
				font-family: ${typography.data};
				font-size: 14px;
				line-height: 100%;
				text-align: center;
				vertical-align: middle;
			`, // Field name blocks
			tableHeader: css`
				font-family: ${typography.subheading};
				font-size: 16px;
				font-weight: bold;
				line-height: 100%;
			`, // Table column headers
		},

		shadow, // subtle: table scrolling, accordion: dropdown shadows
		// Map dimensions but only include properties Lectern expects
		dimensions: {
			navbar: dimensions.navbar,
			footer: dimensions.footer,
			facets: dimensions.facets,
			labIcon: {
				height: dimensions.labIcon.height,
			},
		},
		// icons: Can be overridden with custom icon components
	};
};
