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
import { ReactElement } from 'react';
import { CustomUIThemeInterface } from '../theme';

import GenderChart from './GenderChart';
import AncestryChart from './AncestryChart';
import BirthSexChart from './BirthSexChart';
import FamilyHistoryChart from './FamilyHistoryChart';
import CancerDiagnosisChart from './CancerDiagnosisChart';
import GeneticsClinicVisitedChart from './GeneticsClinicVisitedChart';
import MolecularLabVisitedChart from './MolecularLabVisitedChart';
import HistoryOfCancerChart from './HistoryOfCancerChart';
import VitalStatusChart from './VitalStatusChart';

const ChartsLayout = (): ReactElement => {
	const theme = useTheme() as CustomUIThemeInterface;

	return (
		<div
			css={css`
				margin: 0.9375rem 0;
				background-color: ${theme.colors.white};
				border-radius: 0.5rem;
				border: 0.0625rem solid #BABCC2;
				padding: 0.9375rem;
			`}
		>
			<div
				css={css`
					display: grid;
					grid-template-columns: repeat(4, 1fr);
					gap: 0.9375rem;
					margin-bottom: -0.625rem;
					margin-top: -0.625rem;
					@media (max-width: 1400px) {
						grid-template-columns: repeat(2, 1fr);
					}
					@media (max-width: 768px) {
						grid-template-columns: 1fr;
					}
				`}
			>
				<div>
					<GenderChart />
				</div>
				<div>
					<AncestryChart />
				</div>
				<div>
					<BirthSexChart />
				</div>
				<div>
					<FamilyHistoryChart />
				</div>
			</div>

			<div
				css={css`
					display: grid;
					grid-template-columns: 2fr 1fr 1fr;
					gap: 1.25rem;
					margin-bottom: -0.625rem;
					@media (max-width: 1200px) {
						grid-template-columns: repeat(2, 1fr);
					}
					@media (max-width: 768px) {
						grid-template-columns: 1fr;
					}
				`}
			>
				<div>
					<GeneticsClinicVisitedChart />
				</div>
				<div>
					<HistoryOfCancerChart />
				</div>
				<div>
					<MolecularLabVisitedChart />
				</div>
			</div>

			<div
				css={css`
					display: grid;
					grid-template-columns: repeat(2, 1fr);
					gap: 1.25rem;
					@media (max-width: 1200px) {
						grid-template-columns: 1fr;
					}
					margin-bottom: -0.625rem;
				`}
			>
				<div>
					<CancerDiagnosisChart />
				</div>
				<div>
					<VitalStatusChart />
				</div>
			</div>
		</div>
	);
};

export default ChartsLayout;

