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
import { ReactElement, useEffect, useState } from 'react';
import { StageThemeInterface } from '../../theme';

const STORAGE_KEY = 'stage-welcome-banner-dismissed';

interface WelcomeBannerProps {
	/** Disable the banner entirely (useful for specific deployments) */
	disabled?: boolean;
}

/**
 * WelcomeBanner Component
 *
 * Displays a welcome message to first-time visitors on the homepage.
 * The banner can be dismissed and won't show again (stored in localStorage).
 *
 * Can be disabled via:
 * - Component prop: <WelcomeBanner disabled={true} />
 * - Environment variable: NEXT_PUBLIC_DISABLE_WELCOME_BANNER=true
 */
const WelcomeBanner = ({ disabled = false }: WelcomeBannerProps = {}): ReactElement | null => {
	const theme = useTheme() as StageThemeInterface;
	const [isVisible, setIsVisible] = useState(false);
	const [isClosing, setIsClosing] = useState(false);

	// Check if banner is disabled via environment variable
	const isDisabledViaEnv = process.env.NEXT_PUBLIC_DISABLE_WELCOME_BANNER === 'true';

	useEffect(() => {
		// Don't show if disabled via prop or environment variable
		if (disabled || isDisabledViaEnv) {
			return;
		}

		// Check if banner was previously dismissed
		const wasDismissed = localStorage.getItem(STORAGE_KEY);
		if (!wasDismissed) {
			// Small delay for smoother appearance
			setTimeout(() => setIsVisible(true), 500);
		}
	}, [disabled, isDisabledViaEnv]);

	const handleDismiss = () => {
		setIsClosing(true);
		// Wait for animation to complete
		setTimeout(() => {
			localStorage.setItem(STORAGE_KEY, 'true');
			setIsVisible(false);
			setIsClosing(false);
		}, 300);
	};

	// Don't render if disabled
	if (disabled || isDisabledViaEnv) {
		return null;
	}

	if (!isVisible) {
		return null;
	}

	return (
		<>
			{/* Backdrop overlay with blur */}
			<div
				css={css`
					position: fixed;
					top: 0;
					left: 0;
					right: 0;
					bottom: 0;
					background: rgba(0, 0, 0, 0.4);
					backdrop-filter: blur(4px);
					z-index: 999;
					animation: ${isClosing ? 'fadeOut' : 'fadeIn'} 0.3s ease-out;

					@keyframes fadeIn {
						from {
							opacity: 0;
						}
						to {
							opacity: 1;
						}
					}

					@keyframes fadeOut {
						from {
							opacity: 1;
						}
						to {
							opacity: 0;
						}
					}
				`}
				onClick={handleDismiss}
			/>

			{/* Modal */}
			<div
				css={css`
					position: fixed;
					top: 50%;
					left: 50%;
					transform: translate(-50%, -50%);
					z-index: 1000;
					max-width: 600px;
					width: calc(100% - 32px);
					animation: ${isClosing ? 'scaleOut' : 'scaleIn'} 0.3s ease-out;

					@keyframes scaleIn {
						from {
							opacity: 0;
							transform: translate(-50%, -50%) scale(0.9);
						}
						to {
							opacity: 1;
							transform: translate(-50%, -50%) scale(1);
						}
					}

					@keyframes scaleOut {
						from {
							opacity: 1;
							transform: translate(-50%, -50%) scale(1);
						}
						to {
							opacity: 0;
							transform: translate(-50%, -50%) scale(0.9);
						}
					}

					@media (max-width: 768px) {
						max-width: 90%;
					}
				`}
			>
				{/* Gradient border container */}
				<div
					css={css`
						background: linear-gradient(
							135deg,
							${theme.colors.accent2_light},
							${theme.colors.primary_light},
							${theme.colors.accent3_light}
						);
						padding: 4px;
						border-radius: 16px;
						box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
					`}
				>
					{/* Inner content card */}
					<div
						css={css`
							background: linear-gradient(135deg, ${theme.colors.primary_light} 0%, ${theme.colors.primary} 100%);
							color: ${theme.colors.white};
							padding: 32px;
							border-radius: 12px;
							position: relative;

							@media (max-width: 768px) {
								padding: 24px;
							}
						`}
					>
						{/* Close button */}
						<button
							onClick={handleDismiss}
							aria-label="Dismiss welcome message"
							css={css`
								position: absolute;
								top: 16px;
								right: 16px;
								background: rgba(255, 255, 255, 0.2);
								border: none;
								width: 32px;
								height: 32px;
								border-radius: 50%;
								cursor: pointer;
								display: flex;
								align-items: center;
								justify-content: center;
								transition: all 0.2s ease;
								color: ${theme.colors.white};
								font-size: 20px;
								font-weight: bold;
								padding: 0;

								&:hover {
									background: rgba(255, 255, 255, 0.3);
									transform: scale(1.1);
								}

								&:focus {
									outline: 2px solid ${theme.colors.white};
									outline-offset: 2px;
								}
							`}
						>
							×
						</button>

						{/* Content */}
						<div
							css={css`
								margin-right: 40px;
							`}
						>
							<p
								css={css`
									margin: 0 0 20px 0;
									font-size: 15px;
									line-height: 1.7;
									opacity: 0.95;
									font-family: ${theme.typography.regular};
									text-align: center;

									@media (max-width: 768px) {
										font-size: 14px;
									}
								`}
							>
								Congratulations on your new deployment! 🎉
								<br />
								<br />
								To keep Overture open-source and freely available, we rely on user stories and feedback. Your input
								helps us improve the platform, demonstrate its impact, and secure the funding needed for continued
								development.
								<br />
								<br />
								We'd love to hear how you're using Overture, offer support, and evolve the platform based on your
								experience.
								<br />
								<br />
							</p>
							<div
								css={css`
									display: flex;
									gap: 12px;
									flex-wrap: wrap;
									justify-content: center;
									align-items: center;

									@media (max-width: 768px) {
										flex-direction: column;
									}
								`}
							>
								{/* Primary CTA - Introduce Yourself */}
								<a
									href="https://github.com/overture-stack/docs/discussions/categories/new-deployments?discussions_q=is%3Aopen+category%3A%22New+Deployments%22"
									target="_blank"
									rel="noopener noreferrer"
									onClick={(e) => {
										e.preventDefault();
										// Pre-fill discussion template
										const title = encodeURIComponent('👋 New Deployment Introduction');
										const body = encodeURIComponent(
											`Hi everyone! 👋\n\n` +
												`I've just deployed Overture and successfully reached the homepage!\n\n` +
												`**About my deployment:**\n` +
												`- Organization/Project: [Your organization name]\n` +
												`- Use case: [Brief description of what you'll be using Stage for]\n` +
												`- Deployment date: ${new Date().toLocaleDateString()}\n\n` +
												`Looking forward to connecting with the community, sharing my experience, and learning from others.\n\n` +
												`Happy to answer questions or provide feedback to help improve the platform!`,
										);
										// Open in new tab with pre-filled content
										window.open(
											`https://github.com/overture-stack/docs/discussions/new?category=new-deployments&title=${title}&body=${body}`,
											'_blank',
										);
									}}
									css={css`
										display: inline-flex;
										align-items: center;
										padding: 12px 28px;
										background: ${theme.colors.white};
										color: ${theme.colors.primary};
										text-decoration: none;
										border-radius: 8px;
										font-weight: 700;
										font-size: 15px;
										font-family: ${theme.typography.button};
										transition: all 0.2s ease;
										box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
										flex: 1;
										justify-content: center;
										max-width: 280px;

										&:hover {
											transform: translateY(-3px);
											box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
											color: ${theme.colors.primary_dark};
										}

										&:focus {
											outline: 3px solid ${theme.colors.white};
											outline-offset: 2px;
										}

										@media (max-width: 768px) {
											max-width: 100%;
											width: 100%;
										}
									`}
								>
									👋 Introduce Yourself
								</a>

								{/* Secondary CTA - Maybe Later */}
								<button
									onClick={handleDismiss}
									css={css`
										display: inline-flex;
										align-items: center;
										padding: 12px 28px;
										background: rgba(255, 255, 255, 0.15);
										color: ${theme.colors.white};
										border: 1px solid rgba(255, 255, 255, 0.3);
										border-radius: 8px;
										font-weight: 600;
										font-size: 15px;
										font-family: ${theme.typography.button};
										cursor: pointer;
										transition: all 0.2s ease;
										flex: 1;
										justify-content: center;
										max-width: 200px;

										&:hover {
											background: rgba(255, 255, 255, 0.25);
											border-color: rgba(255, 255, 255, 0.5);
										}

										&:focus {
											outline: 2px solid ${theme.colors.white};
											outline-offset: 2px;
										}

										@media (max-width: 768px) {
											max-width: 100%;
											width: 100%;
										}
									`}
								>
									Maybe Later
								</button>
							</div>
						</div>
					</div>
				</div>
			</div>
		</>
	);
};

export default WelcomeBanner;
