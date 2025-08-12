/*
 *
 * Copyright (c) 2021 The Ontario Institute for Cancer Research. All rights reserved
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

import { DMSThemeInterface } from '../../theme';
import {
	getVisualizationFocusCss,
	useVisualizationFocusContext,
} from './VisualizationFocusContext';

const getCurrentSQONStyles = (theme: DMSThemeInterface) => ({
	callerName: 'QueryBar',
	components: {
		SQONViewer: {
			EmptyMessage: {
				fontWeight: 'normal',
			},
			SQONBubble: {
				borderRadius: '8px',
				fontSize: '13px',
				fontWeight: 300,
				letterSpacing: '0.2px',
			},
			SQONClear: {
				background: theme.colors.white,
				borderColor: theme.colors.grey_5,
				borderRadius: '5px',
				fontColor: theme.colors.accent_dark,
				fontSize: '14px',
				fontWeight: 'bold',
				lineHeight: '1.2rem',
				padding: '0.05rem 0.7rem',
				hoverBackground: theme.colors.secondary_light,
			},
			SQONFieldName: {
				fontColor: 'inherit',
				fontWeight: 'normal',
				textTransform: 'uppercase',
			},
			SQONLessOrMore: {
				background: theme.colors.accent_light,
				css: css(theme.typography.label),
				fontColor: theme.colors.white,
				padding: '0.2rem 0.6rem',
				textTransform: 'uppercase',
			},
			SQONOp: {
				fontColor: 'inherit',
				fontWeight: 'normal',
			},
			SQONValue: {
				background: theme.colors.accent,
				css: css`
					${theme.typography.label};

					&:after {
						content: url(data:image/svg+xml,%3Csvg%20width%3D%228%22%20height%3D%228%22%20stroke%3D%22white%22%20stroke-width%3D%222%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%0A%20%20%3Cline%20x1%3D%220%22%20y1%3D%220%22%20x2%3D%228%22%20y2%3D%228%22%20/%3E%0A%20%20%3Cline%20x1%3D%228%22%20y1%3D%220%22%20x2%3D%220%22%20y2%3D%228%22%20/%3E%0A%3C/svg%3E);
						margin-left: 9px;
					}
				`,
				fontColor: theme.colors.white,
				margin: '0.1rem 0.2rem',
				padding: '0.2rem 0.6rem',
				textDecoration: 'none',
			},
			SQONValueGroup: {
				fontColor: theme.colors.accent,
				fontSize: '1.4rem',
				lineHeight: '1.4rem',
				margin: '0 0.1rem',
			},
			SQONWrapper: {
				fontColor: theme.colors.accent_dark,
				fontFamily: '"Lato", sans-serif',
			},
		},
	},
});

const QueryBar = () => {
	const theme = useTheme();
	useArrangerTheme(getCurrentSQONStyles(theme));
	const { hasVisualizationFocus } = useVisualizationFocusContext();

	return (
		<Row
			gutterWidth={2}
			css={css`
				min-height: 48px;
				margin: 10px 0;
				background-color: ${theme.colors.white};
				border-radius: 5px;
				${theme.shadow.default};
				${getVisualizationFocusCss(hasVisualizationFocus)};
			`}
		>
			<SQONViewer />
		</Row>
	);
};

export default QueryBar;
