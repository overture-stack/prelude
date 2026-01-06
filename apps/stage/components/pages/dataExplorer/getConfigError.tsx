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

import StyledLink from '@/components/Link';
import { GenericHelpMessage } from '@/components/PlatformAdminContact';
import { Checkmark, Warning } from '@/components/theme/icons';
import { css, useTheme } from '@emotion/react';
import { ReactNode } from 'react';

/**
 * TypeScript Concept: Props Interface
 * - Defines what data this component needs to receive from its parent
 * - Makes the component reusable with different configurations
 */
interface GetConfigErrorProps {
	hasConfig: boolean;          // Whether Arranger configuration is valid
	documentType: string;         // GraphQL document type name
	index: string;                // Elasticsearch index name
	arrangerAdminUIUrl: string;   // URL to Arranger Admin UI
}

/**
 * Component for rendering a link to the Arranger Admin UI.
 *
 * React Concept: Small, focused components
 * - Break UI into small, reusable pieces
 * - This component just renders a styled link
 */
const ArrangerAdminUILink = ({ url }: { url: string }) => {
	return (
		<StyledLink href={url} target="_blank">
			Arranger Admin UI
		</StyledLink>
	);
};

/**
 * Component for rendering a single configuration item in the list.
 *
 * React/TypeScript Concepts:
 * - Props destructuring: { Icon, value, fieldName }
 * - Optional props: Icon is optional (Icon?)
 * - Conditional rendering: Different styling based on value
 * - CSS-in-JS: Using emotion's css prop for styling
 */
const ListItem = ({ Icon, value, fieldName }: { Icon?: ReactNode; value: string; fieldName: string }) => {
	const theme = useTheme(); // React Hook: access the app's theme

	return (
		<li
			css={css`
				display: flex;
				align-items: center;
				${value === 'Missing' &&
				css`
					color: ${theme.colors.error_dark};
				`}
			`}
		>
			{/* If no Icon provided, use default Checkmark */}
			{Icon || <Checkmark size={16} fill={theme.colors.primary} />}
			<span
				css={css`
					padding-left: 6px;
				`}
			>
				{fieldName}:{' '}
				<span
					css={css`
						font-weight: bold;
					`}
				>
					{value}
				</span>
			</span>
		</li>
	);
};

/**
 * Component for rendering a warning item (missing configuration).
 *
 * React Concept: Component Composition
 * - This component uses the ListItem component
 * - Passes specific props to customize it as a warning
 */
const WarningListItem = ({ fieldName }: { fieldName: string }) => (
	<ListItem Icon={<Warning size={16} />} fieldName={fieldName} value={'Missing'} />
);

/**
 * Main function that generates error messages based on configuration status.
 *
 * React Concepts:
 * - Conditional rendering: Returns different JSX based on conditions
 * - JSX: HTML-like syntax in JavaScript
 * - Ternary operators: condition ? ifTrue : ifFalse
 *
 * TypeScript Concept:
 * - Function parameters with types
 * - Return type is ReactNode (can be any React element)
 *
 * @param props - Configuration values to validate
 * @returns JSX element with error message, or false if no error
 */
const getConfigError = ({ hasConfig, documentType, index, arrangerAdminUIUrl }: GetConfigErrorProps): ReactNode => {
	// Check if both required values exist
	if (index && documentType) {
		// If values exist but config is invalid, show this error
		if (!hasConfig) {
			return (
				<span>
					No active configurations for the portal were found. Please make sure the index and GraphQL document type
					specified in the{' '}
					<span
						css={css`
							font-weight: bold;
						`}
					>
						docker-compose.yml
					</span>{' '}
					file during installation have been created in the <ArrangerAdminUILink url={arrangerAdminUIUrl} />.{' '}
					<GenericHelpMessage />
				</span>
			);
		}
		// If values exist and config is valid, no error
		return false;
	}

	// If required values are missing, show detailed error with list
	return (
		<span>
			One or more of the following values required by the portal do not exist. Please make sure the values are
			specified in the{' '}
			<span
				css={css`
					font-weight: bold;
				`}
			>
				docker-compose.yml
			</span>{' '}
			file during installation and have been used to create your project in the{' '}
			<ArrangerAdminUILink url={arrangerAdminUIUrl} />. <GenericHelpMessage />
			<ul
				css={css`
					list-style-type: none;
					padding-left: 0px;
				`}
			>
				{/* Array.map: Loop through items and create JSX for each */}
				{[
					{ fieldName: 'GraphQL Document type', value: documentType },
					{ fieldName: 'Elasticsearch index', value: index },
				].map(({ fieldName, value }) => {
					// Conditional rendering: Show checkmark or warning based on value
					return value ? (
						<ListItem key={`${fieldName}-${value}`} fieldName={fieldName} value={value} />
					) : (
						<WarningListItem key={`${fieldName}-${value}`} fieldName={fieldName} />
					);
				})}
			</ul>
		</span>
	);
};

export default getConfigError;
