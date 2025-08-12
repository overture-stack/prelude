/*
 *
 * Copyright (c) 2023 The Ontario Institute for Cancer Research. All rights reserved
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

import { css, Theme } from '@emotion/react';

export const getDropdownTheme = (theme: Theme) => ({
  arrowColor: theme.colors.white,
  arrowTransition: 'all 0s',
  background: theme.colors.accent,
  borderColor: theme.colors.accent,
  css: css`
    ${theme.typography.subheading2}
    border-width: 1px;
    line-height: 24px;
  `,
  fontColor: theme.colors.white,
  disabledFontColor: theme.colors.grey_5,
  hoverBackground: theme.colors.accent_dark,
  fontSize: '14px',
  padding: '2px 10px',
  ListWrapper: {
    background: theme.colors.white,
    css: css`
      ${theme.shadow.default},
    `,
    fontColor: theme.colors.black,
    fontSize: '0.7rem',
    hoverBackground: theme.colors.grey_2,
  },
});
