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

import { PropsWithChildren } from 'react';
import styled from '@emotion/styled';
import { css } from '@emotion/react';
import defaultTheme from './theme';

const StyledButton = styled('button')`
  ${({ theme }: { theme: typeof defaultTheme }) => css`
    color: ${theme.colors.accent_dark};
    background-color: ${theme.colors.grey_2};
    ${theme.typography.subheading2};
    line-height: 22px;
    border-radius: 7px;
    border: 1px solid ${theme.colors.grey_3};
    padding: 0 28px 0 8px;
    display: flex;
    justify-content: center;
    align-items: center;
    cursor: pointer;
    position: relative;
    font-size: 12px;
    &:hover {
      background-color: ${theme.colors.grey_3};
      border: 1px solid ${theme.colors.grey_4};
    }
  `}
`;

const PlusMinusIcon = styled('span')`
  ${({ theme }: { theme: typeof defaultTheme }) => css`
    display: block;
    border: 1px solid ${theme.colors.grey_5};
    color: ${theme.colors.grey_6};
    border-radius: 5px;
    background: ${theme.colors.white};
    text-align: center;
    width: 12px;
    height: 12px;
    line-height: 12px;
    position: absolute;
    right: 4px;
    top: 4px;
  `}
`;

const ExpandButton = ({
  children,
  isOpen,
  onClick,
}: PropsWithChildren<{ isOpen: boolean; onClick: () => void }>) => {
  return (
    <StyledButton onClick={onClick}>
      <span
        css={css`
          display: block;
        `}
      >
        {children}
      </span>
      <PlusMinusIcon>{isOpen ? '-' : '+'}</PlusMinusIcon>
    </StyledButton>
  );
};

export default ExpandButton;
