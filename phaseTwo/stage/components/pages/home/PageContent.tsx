/*
 *
 * Copyright (c) 2022 The Ontario Institute for Cancer Research. All rights reserved
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
import { ReactElement } from 'react';
import HeroBanner from './HeroBanner';
import SiteMap from './SiteMap';
import Acknowledgment from './acknowledgement';

const styles = {
	pageContainer: css`
		display: flex;
		gap: 2rem;
		padding: 0 50px;

		@media (max-width: 768px) {
			flex-direction: column;
			padding: 0 20px;
			gap: 1rem;
		}
	`,
	mainContent: css`
		flex: 1;
	`,
	sidebar: css`
		width: 300px;
		align-self: flex-start;

		@media (max-width: 768px) {
			width: 100%;
		}
	`,
};

const PageContent = (): ReactElement => {
	return (
		<main
			css={(theme) => css`
				display: flex;
				flex-direction: column;
				padding-bottom: ${theme.dimensions.footer.height}px;
				background-color: ${theme.colors.main};
			`}
		>
			<HeroBanner />
			<div css={styles.pageContainer}>
				<div css={styles.mainContent}>
					<SiteMap />
				</div>
				<div css={styles.sidebar}>
					<Acknowledgment />
				</div>
			</div>
		</main>
	);
};

export default PageContent;
