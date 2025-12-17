/** @jsxImportSource @emotion/react */
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
import { UseThemeContextProps } from '@overture-stack/arranger-components/dist/types';
import { ReactElement } from 'react';
import { CustomUIThemeInterface } from '../theme';

const getThemeCustomisations = (theme: CustomUIThemeInterface): UseThemeContextProps => ({
	callerName: 'Data-Table-4-QueryBar',
	components: {
		SQONViewer: {
			EmptyMessage: {
				arrowColor: '#36581C',
			},
			SQONBubble: {
				borderRadius: '0.5rem',
				fontSize: '0.8125rem',
				fontWeight: 300,
				height: '1.6rem',
				letterSpacing: '0.0125rem',
			},
			SQONClear: {
				label: 'Clear',
				borderColor: theme.colors.grey_3,
				borderRadius: '0.3125rem',
				background: '#FFFFFF',
				cursor: 'pointer',
				fontColor: theme.colors.black,
				fontSize: '0.88rem',
				fontWeight: 600,
				hoverBackground: '#FFFFFF',
				padding: '0 0.75rem',
			},
			SQONFieldName: {
				fontWeight: 'bold',
				textTransform: 'uppercase',
			},
			SQONGroup: {
				fontColor: theme.colors.grey_6,
				margin: '0.1rem 0 0',
			},
			SQONLessOrMore: {
				background: '#36581C',
				css: css`
					font-size: 0.6875rem;
				`,
				fontColor: theme.colors.white,
				hoverBackground: '#36581C',
				lineHeight: '1.4rem !important',
				margin: '0 0.4rem 0 0',
				padding: '0 0.4rem',
				textTransform: 'uppercase',
			},
			SQONValue: {
				background: '#36581C',
				css: css`
					margin-left: 0;
					font-size: 0.6875rem;
					font-weight: bold;
					&::after {
						content: url(data:image/svg+xml,%3Csvg%20width%3D%228%22%20height%3D%228%22%20stroke%3D%22white%22%20stroke-width%3D%222%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%0A%20%20%3Cline%20x1%3D%220%22%20y1%3D%220%22%20x2%3D%228%22%20y2%3D%228%22%20/%3E%0A%20%20%3Cline%20x1%3D%228%22%20y1%3D%220%22%20x2%3D%220%22%20y2%3D%228%22%20/%3E%0A%3C/svg%3E);
						margin: 0 0 0 0.5rem;
					}
				`,
				fontColor: theme.colors.white,
				fontWeight: 'bold',
				hoverBackground: '#36581C',
				margin: '0.1rem 0.4rem',
				padding: '0 0.5rem',
			},
			SQONValueGroup: {
				css: css`
					&:last-of-type {
						margin-left: 0;
					}
				`,
				fontSize: '1.4rem',
				margin: '-0.2rem 0.4rem 0',
			},
		},
	},
});

const QueryBar = (): ReactElement => {
	const theme = useTheme() as CustomUIThemeInterface;
	useArrangerTheme(getThemeCustomisations(theme));
	return (
		<div
			css={css`
				min-height: 48px;
				margin: 0.625rem 0;
				background-color: ${theme.colors.white};
				border-radius: 0.3125rem;
				border: 0.0625rem solid #BABCC2;
				padding: 0.625rem;
			`}
		>
			<SQONViewer emptyMessage="Explore data by selecting filters." />
		</div>
	);
};

export default QueryBar;

