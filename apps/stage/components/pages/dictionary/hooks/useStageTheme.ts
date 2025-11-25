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

import { useTheme } from '@emotion/react';
import defaultTheme, { StageThemeInterface } from '../../../theme';

/**
 * Custom hook to get Stage theme with fallback for components rendered outside theme context
 *
 * This hook is useful for components that may be:
 * - Rendered normally within the app's theme provider
 * - Hydrated client-side via ReactDOM.render (e.g., in documentation pages)
 *
 * @returns Stage theme (from context or default)
 *
 * @example
 * ```tsx
 * const stageTheme = useStageTheme();
 * const lecternTheme = createLecternTheme(stageTheme);
 * ```
 */
export const useStageTheme = (): StageThemeInterface => {
	const contextTheme = useTheme();

	// If theme context exists and has content, use it; otherwise fall back to default
	const stageTheme = (contextTheme && Object.keys(contextTheme).length > 0
		? contextTheme
		: defaultTheme) as StageThemeInterface;

	return stageTheme;
};
