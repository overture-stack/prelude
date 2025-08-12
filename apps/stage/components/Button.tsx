/*
 *
 * Copyright (c) 2021 The Ontario Institute for Cancer Research. All rights reserved
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

import React, { ReactNode } from 'react';
import { css, useTheme } from '@emotion/react';
import styled from '@emotion/styled';

import defaultTheme from './theme';
import { Spinner } from './theme/icons';

export type ButtonVariant = 'primary' | 'secondary';
export type ButtonSize = 'sm' | 'md';

export const BUTTON_VARIANTS: {
  PRIMARY: ButtonVariant;
  SECONDARY: ButtonVariant;
} = Object.freeze({
  PRIMARY: 'primary',
  SECONDARY: 'secondary',
});

export const BUTTON_SIZES: {
  SM: ButtonSize;
  MD: ButtonSize;
} = Object.freeze({
  SM: 'sm',
  MD: 'md',
});

const getButtonTheme = (theme: typeof defaultTheme) => ({
  [BUTTON_VARIANTS.PRIMARY]: {
    color: theme.colors.white,
    background: theme.colors.accent,
    'border-color': theme.colors.accent,
    hover: { background: theme.colors.accent_dark },
  },
  [BUTTON_VARIANTS.SECONDARY]: {
    color: theme.colors.accent_dark,
    background: theme.colors.grey_2,
    'border-color': theme.colors.grey_3,
    hover: { background: theme.colors.white },
  },
});

const getButtonSizing = (theme: typeof defaultTheme) => ({
  [BUTTON_SIZES.SM]: {
    padding: '3px 8px',
    'font-size': '11px',
    'border-radius': '7px',
    'line-height': '15px',
  },
  [BUTTON_SIZES.MD]: {
    padding: '6px 15px',
    'font-size': '14px',
    'border-radius': '5px',
    'line-height': '24px',
  },
});

const ButtonElement = styled('button')`
  ${({
    size,
    theme,
    variant,
  }: {
    size: ButtonSize;
    theme: typeof defaultTheme;
    variant: ButtonVariant;
  }) => css`
    ${theme.typography.subheading2};
    font-size: ${getButtonSizing(theme)[size]['font-size']};
    color: ${getButtonTheme(theme)[variant].color};
    background: ${getButtonTheme(theme)[variant].background};
    border-color: ${getButtonTheme(theme)[variant]['border-color']};
    line-height: ${getButtonSizing(theme)[size]['line-height']};
    border-radius: ${getButtonSizing(theme)[size]['border-radius']};
    border-width: 1px;
    border-style: solid;
    display: flex;
    padding: ${getButtonSizing(theme)[size].padding};
    justify-content: center;
    align-items: center;
    cursor: pointer;
    position: relative;
    &:hover {
      background: ${getButtonTheme(theme)[variant].hover.background};
    }
    &:disabled,
    &:disabled:hover {
      background-color: ${theme.colors.grey_6};
      cursor: not-allowed;
      color: ${theme.colors.white};
      border: 1px solid ${theme.colors.grey_6};
    }
  `}
`;

const Button = React.forwardRef<
  HTMLButtonElement,
  {
    children?: ReactNode;
    disabled?: boolean;
    onClick?: (
      e: React.SyntheticEvent<HTMLButtonElement>,
    ) => any | ((e: React.SyntheticEvent<HTMLButtonElement>) => Promise<any>);
    isAsync?: boolean;
    className?: string;
    isLoading?: boolean;
    variant?: ButtonVariant;
    size?: ButtonSize;
  }
>(
  (
    {
      children,
      onClick = (e) => {},
      disabled = false,
      isAsync = false,
      className,
      isLoading: controlledLoadingState,
      variant = BUTTON_VARIANTS.PRIMARY,
      size = BUTTON_SIZES.MD,
    },
    ref = React.createRef(),
  ) => {
    const theme = useTheme();
    const [isLoading, setLoading] = React.useState(false);

    /**
     * controlledLoadingState will allows consumer to control the loading state.
     * Else, that is set by the component internally
     */
    const shouldShowLoading = !!controlledLoadingState || (isLoading && isAsync);

    const onClickFn = async (event: any) => {
      setLoading(true);
      await onClick(event);
      setLoading(false);
    };

    const loaderSize = size === BUTTON_SIZES.SM ? 10 : 15;

    return (
      <ButtonElement
        ref={ref}
        onClick={isAsync ? onClickFn : onClick}
        disabled={disabled || shouldShowLoading}
        className={className}
        variant={variant}
        theme={theme}
        size={size}
      >
        <span
          css={css`
            visibility: ${shouldShowLoading ? 'hidden' : 'visible'};
          `}
        >
          {children}
        </span>
        <span
          css={(theme) => css`
            position: absolute;
            visibility: ${shouldShowLoading ? 'visible' : 'hidden'};
            bottom: 1px;
          `}
        >
          <Spinner fill={theme.colors.white} height={loaderSize} width={loaderSize} />
        </span>
      </ButtonElement>
    );
  },
);

export default Button;
