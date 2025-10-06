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
 * Transforms Stage theme into Lectern-compatible theme structure.
 * This ensures the Data Dictionary viewer uses the same color palette,
 * typography, and sizing as the rest of the application.
 *
 * Note: Lectern uses RecursivePartial<Theme>, so we can override specific
 * properties while using Lectern's defaults for the rest.
 */
export const createLecternTheme = (stageTheme: StageThemeInterface) => {
	const { colors, typography } = stageTheme;

	return {
		colors: {
			// Interactive elements - Links, active states, hover states
			accent: colors.primary,
			accent_light: colors.primary_light,
			accent_dark: colors.primary_dark,
			accent_1: colors.primary_palest, // Subtle accent backgrounds

			// Additional accent colors - Supplementary interactive elements
			accent2: colors.accent2,
			accent2_dark: colors.accent2_dark,
			accent2_light: colors.accent2_light,
			accent3: colors.accent3_dark,

			// Primary brand colors - Headers, buttons, key UI elements
			primary: colors.primary,
			primary_dark: colors.primary_dark,

			// Secondary brand colors - Table headers, toolbar, navigation
			secondary: colors.secondary,
			secondary_light: colors.secondary_light,
			secondary_dark: colors.secondary_dark,
			secondary_accessible: colors.secondary, // High contrast version
			secondary_1: colors.secondary_lightest, // Lightest variant for backgrounds
			secondary_2: colors.secondary_light, // Light variant for hover states

			// Background colors
			background_light: colors.white, // Button background
			background_muted: colors.grayscale_lighter, // Disabled states, inactive areas
			background_alternate: colors.grayscale_lightest, // Alternating rows, cards
			background_overlay: colors.black, // Modal overlays
			background_pill: colors.grayscale_lightest, // Tag/pill background
			background_pill_hover: colors.secondary_palest, // Tag/pill hover state

			// Border colors
			border_light: colors.grayscale_lighter, // Subtle dividers
			border_medium: colors.grayscale_lighter, // Standard borders
			border_subtle: colors.grey_2, // Very subtle separators
			border_muted: colors.grayscale_lightest, // Barely visible borders
			border_button: colors.primary, // Button outlines

			// Semantic colors - Error states, validation messages
			error: colors.accent2_dark, // Primary error color
			error_dark: colors.error_dark, // Error text
			error_1: colors.error_1, // Error backgrounds
			error_2: colors.error_2, // Error borders
			error_modal_bg: colors.error_light, // Error modal background

			// Warning states - Cautionary messages, alerts
			warning: colors.accent3_dark,
			warning_dark: colors.warning_dark,

			// Base colors
			white: colors.white,
			black: colors.black,

			// Greyscale - Text, icons, disabled states
			grey_1: colors.grey_1, // Lightest grey
			grey_2: colors.grey_2, // Light grey
			grey_3: colors.grey_3, // Medium grey
			grey_4: colors.grey_3, // Medium-dark grey
			grey_5: colors.grey_5, // Dark grey
			grey_6: colors.black, // Darkest grey/black
			grey_highlight: colors.grey_highlight, // Highlighted grey backgrounds
		},

		// Typography - Using Stage's font families with Lectern's size/weight system
		typography: {
			// main title: 30px Bold
			subtitleBold: css`
				font-family: ${typography.regular};
				font-size: 30px;
				line-height: 100%;
			`,

			headingSmall: css`
				font-size: 22px;
			`,

			// body: 18px - Standard body text
			body: css`
				font-family: ${typography.regular};
				line-height: 150%;
			`,

			// paragraphBold: 26px Bold
			paragraphBold: css`
				font-family: ${typography.heading};
				font-size: 260px;
				line-height: 130%;
			`,

			// paragraphSmall: 16px - Smaller text blocks
			paragraphSmall: css`
				font-family: ${typography.regular};
				font-size: 14px;
				line-height: 140%;
			`,

			// paragraphSmallBold: 16px Bold
			paragraphSmallBold: css`
				font-family: ${typography.label};
				font-size: 16px;
				line-height: 140%;
			`,
			// buttonText: 20px Bold - Button labels
			buttonText: css`
				font-family: ${typography.regular};
				font-size: 16px;
				line-height: 1.5;
				vertical-align: middle;
			`,
			// fieldBlock: 16px Monospace - Code blocks, field names
			fieldBlock: css`
				font-family: ${typography.data};
				font-size: 14px;
				line-height: 100%;
				text-align: center;
				vertical-align: middle;
			`,

			// tableHeader: 14px Bold - Table column headers
			tableHeader: css`
				font-family: ${typography.subheading};
				font-size: 16px;
				line-height: 100%;
			`,
		},
	};
};
