/*
 * Copyright (c) 2025 The Ontario Institute for Cancer Research. All rights reserved
 *
 * This program and the accompanying materials are made available under the terms of
 * the GNU Affero General Public License v3.0. You should have received a copy of the
 * GNU Affero General Public License along with this program.
 *  If not, see <http://www.gnu.org/licenses/>.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES
 * OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT
 * SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT,
 * INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED
 * TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS;
 * OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER
 * IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN
 * ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

import { OHCRN_PATHS, OICR_TERMS_URL, OICR_URL, getOHCRNHomeLink } from '../../constants/externalPaths';
import { UI_VERSION } from '../../constants/version';
import oicrLogo from '/assets/images/oicr.svg';
import urlJoin from 'url-join';

import styles from './Footer.module.css';
import Versions from './Versions';

const Footer = () => {
	const OHCRN_HOME_LINK = getOHCRNHomeLink();

	const footerLinks: { text: string; url: string }[] = [
		{
			text: 'About OHCRN',
			url: urlJoin(OHCRN_HOME_LINK, OHCRN_PATHS.ABOUT),
		},
		{
			text: 'Help Centre',
			url: urlJoin(OHCRN_HOME_LINK, OHCRN_PATHS.HELP),
		},
		{
			text: 'Contact',
			url: urlJoin(OHCRN_HOME_LINK, OHCRN_PATHS.CONTACT),
		},
		{
			text: 'Terms & Conditions',
			url: OICR_TERMS_URL,
		},
		{
			text: 'Privacy Policy',
			url: urlJoin(OHCRN_HOME_LINK, OHCRN_PATHS.PRIVACY),
		},
	];
	return (
		<footer className={styles.footer}>
			<div className={styles.left}>
				<div>{`© ${new Date().getFullYear()} Ontario Hereditary Cancer Research Network. All rights reserved.`}</div>
				<Versions uiVersion={UI_VERSION} />
			</div>
			<div className={styles.right}>
				<ul className={styles.links}>
					{footerLinks.map((link) => (
						<li key={link.text}>
							<a href={link.url} target="_blank" rel="noopener noreferrer">
								{link.text}
							</a>
						</li>
					))}
				</ul>
				<a href={OICR_URL} target="_blank" rel="noopener noreferrer">
					<img
						src={oicrLogo}
						alt="Ontario Institute for Cancer Research"
						width="54"
						height="40"
					/>
				</a>
			</div>
		</footer>
	);
};

export default Footer;

