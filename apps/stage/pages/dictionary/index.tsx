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
import { ReactElement } from 'react';
import PageLayout from '../../components/PageLayout';
import { DictionaryViewer } from '../../components/pages/dictionary';
import { createPage } from '../../global/utils/pages';

/**
 * Dictionary Page
 *
 * Displays a data dictionary from a static JSON file hosted in the public directory.
 *
 * Architecture:
 * - Page component handles layout and routing
 * - DictionaryViewer component handles Lectern integration
 *
 */
const DictionaryPage = (): ReactElement => {
	return (
		<PageLayout>
			<div
				css={css`
					margin: 0 auto;
					padding-top: 
					padding-bottom: 20rem;
				`}
			>
				<DictionaryViewer dictionaryUrl="/dictionary/dictionary.json" />
			</div>
		</PageLayout>
	);
};

export default createPage({
	isPublic: true,
	getInitialProps: async () => null,
})(DictionaryPage);
