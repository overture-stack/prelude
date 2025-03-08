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

import { css, useTheme } from '@emotion/react';
import { ReactElement } from 'react';
import defaultTheme from '../../theme';

const styles = {
	article: css`
		background-color: ${defaultTheme.colors.hero};
		box-sizing: border-box;
		color: ${defaultTheme.colors.white};
		display: flex;
		padding: 20px;
		width: 100%;
		justify-content: center;
		margin-bottom: 0;
	`,
	section: css`
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		max-width: 1550px;
		width: 100%;

		> * {
			margin: 0;
		}
	`,
	title: css`
		font-size: 30px;
		font-weight: normal;
		position: relative;
		padding-right: 20%;
		margin: 0; /* Add this explicitly */
		@media (min-width: 1345px) {
			font-size: 34px;
		}
	`,
};

const HeroBanner = (): ReactElement => {
	const theme: typeof defaultTheme = useTheme();

	return (
		<article css={styles.article}>
			<section css={styles.section}>
				<h2 css={styles.title}>Documentation</h2>
			</section>
		</article>
	);
};

export default HeroBanner;
