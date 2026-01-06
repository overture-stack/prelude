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

import { css, useTheme } from '@emotion/react';
import { SQONViewer, useArrangerTheme } from '@overture-stack/arranger-components';
import { Row } from 'react-grid-system';
import { createQueryBarTheme } from './theme/queryBarTheme';

/**
 * Props interface for the QueryBar component.
 *
 * TypeScript Concept: Props interface
 * - Defines what data the component needs from its parent
 * - Ensures type safety when using the component
 */
interface QueryBarProps {
	/** Unique identifier for this instance (used for debugging) */
	callerName: string;
}

/**
 * QueryBar Component
 *
 * Displays active filters as removable "bubbles" and a reset button.
 *
 * React Concepts Used:
 * 1. Functional Component - Modern React component style
 * 2. Props - Data passed from parent component
 * 3. Hooks - useTheme() and useArrangerTheme()
 * 4. Component Composition - Uses SQONViewer from Arranger library
 *
 * What this component does:
 * - Shows the current active filters (SQON = Structured Query Object Notation)
 * - Allows users to see what filters they've applied
 * - Provides "X" buttons to remove individual filters
 * - Provides "Reset" button to clear all filters
 *
 * @param props - Component properties
 * @returns JSX element
 */
const QueryBar = ({ callerName }: QueryBarProps) => {
	/**
	 * React Hook: useTheme()
	 * - Accesses the application's theme (colors, fonts, shadows, etc.)
	 * - Provided by Emotion's ThemeProvider higher up in the component tree
	 */
	const theme = useTheme();

	/**
	 * React Hook: useArrangerTheme()
	 * - Applies custom styling to Arranger components
	 * - We pass our theme configuration to customize the SQONViewer appearance
	 *
	 * Pattern: Theme Application
	 * - Create theme config using our factory function
	 * - Apply it using Arranger's hook
	 * - All child Arranger components will use this styling
	 */
	useArrangerTheme(createQueryBarTheme(theme, callerName));

	/**
	 * React Concept: JSX Return
	 * - Components must return JSX (or null)
	 * - JSX looks like HTML but is actually JavaScript
	 */
	return (
		<Row
			gutterWidth={2}
			/**
			 * CSS-in-JS with Emotion:
			 * - css prop accepts template literals
			 * - Can access theme values
			 * - Scoped to this component (no CSS conflicts)
			 *
			 * Arrow function: (theme) => css`...`
			 * - Receives theme as parameter
			 * - Returns CSS styling
			 */
			css={(theme) => css`
				min-height: 48px;
				margin: 10px 0;
				background-color: ${theme.colors.white};
				border-radius: 5px;
				${theme.shadow.default};
			`}
		>
			{/**
			 * SQONViewer Component (from Arranger library)
			 * - Displays active filters
			 * - Styled by our useArrangerTheme call above
			 * - Automatically connected to Arranger's data context
			 *
			 * React Concept: Declarative UI
			 * - We declare WHAT we want (show filters)
			 * - Not HOW to do it (Arranger handles the implementation)
			 */}
			<SQONViewer />
		</Row>
	);
};

export default QueryBar;
