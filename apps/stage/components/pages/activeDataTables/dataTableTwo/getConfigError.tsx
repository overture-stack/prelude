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
import { Checkmark } from '@/components/theme/icons';
import { getConfig } from '@/global/config';
import { css, useTheme } from '@emotion/react';
import { ReactNode } from 'react';

const ArrangerAdminUILink = () => {
	const { NEXT_PUBLIC_ARRANGER_DATATABLE_1_ADMIN_UI } = getConfig();
	return (
		<StyledLink href={NEXT_PUBLIC_ARRANGER_DATATABLE_1_ADMIN_UI} target="_blank">
			Arranger Admin UI
		</StyledLink>
	);
};

const ListItem = ({ Icon, value, fieldName }: { Icon?: ReactNode; value: string; fieldName: string }) => {
	const theme = useTheme();
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

// Modified WarningListItem to not use the Warning icon
const WarningListItem = ({ fieldName }: { fieldName: string }) => {
	const theme = useTheme();
	return (
		<li
			css={css`
				display: flex;
				align-items: center;
				color: ${theme.colors.error_dark};
			`}
		>
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
					Missing
				</span>
			</span>
		</li>
	);
};

const getConfigError = ({
	hasConfig,
	documentType,
	index,
}: {
	hasConfig: boolean;
	documentType: string;
	index: string;
}) =>
	index && documentType ? (
		!hasConfig && (
			<span>
				<strong>If you just ran phase1, this is expected.</strong> Otherwise, if you're setting up Table Two, ensure
				your index and Arranger configurations are correct, referenced properly in the Docker Compose, and that
				environment variables for Conductor, Arranger, and Stage are all set correctly.
			</span>
		)
	) : (
		<span>
			One or more of the following values required by the portal do not exist. Please make sure the values are specified
			in the{' '}
			<span
				css={css`
					font-weight: bold;
				`}
			>
				docker-compose.yml
			</span>{' '}
			file during installation and have been used to create your project in the <ArrangerAdminUILink />.{' '}
			<GenericHelpMessage />
			<ul
				css={css`
					list-style-type: none;
					padding-left: 0px;
				`}
			>
				{[
					{ fieldName: 'GraphQL Document type', value: documentType },
					{ fieldName: 'Elasticsearch index', value: index },
				].map(({ fieldName, value }) => {
					return value ? (
						<ListItem key={`${fieldName}-${value}`} fieldName={fieldName} value={value} />
					) : (
						<WarningListItem key={`${fieldName}-${value}`} fieldName={fieldName} />
					);
				})}
			</ul>
		</span>
	);

export default getConfigError;
