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

import { Theme, css, useTheme } from '@emotion/react';
import styled from '@emotion/styled';
import React from 'react';
import IconButton from './IconButton';

import { Error as ErrorIcon } from './theme/icons';
import DismissIcon from './theme/icons/dismiss';

type ErrorSize = 'lg' | 'md' | 'sm';

const ERROR_SIZES = {
  LG: 'lg' as ErrorSize,
  MD: 'md' as ErrorSize,
  SM: 'sm' as ErrorSize,
};

type ErrorLevel = 'error' | 'warning';

const ERROR_LEVELS = {
  ERROR: 'error' as ErrorLevel,
  WARNING: 'warning' as ErrorLevel,
};

const getIconDimensions = (size: ErrorSize) =>
  ({
    [ERROR_SIZES.LG]: { width: 26, height: 27 },
    [ERROR_SIZES.MD]: { width: 21, height: 22 },
    [ERROR_SIZES.SM]: { width: 18, height: 18 },
  }[size]);

const getDismissIconDimensions = (size: ErrorSize) =>
  ({
    [ERROR_SIZES.LG]: 12,
    [ERROR_SIZES.MD]: 12,
    [ERROR_SIZES.SM]: 9,
  }[size]);

const getFontSize = (size: ErrorSize) =>
  ({
    [ERROR_SIZES.LG]: { fontSize: '16px' },
    [ERROR_SIZES.MD]: { fontSize: '16px' },
    [ERROR_SIZES.SM]: { fontSize: '13px' },
  }[size]);

const getColors = ({ item, level, theme }: { item: string; level: ErrorLevel; theme: Theme }) =>
  ({
    [ERROR_LEVELS.ERROR]: {
      background: theme.colors.error_1,
      border: theme.colors.error_2,
      icon: theme.colors.error_dark,
    },
    [ERROR_LEVELS.WARNING]: {
      background: theme.colors.warning_light,
      border: theme.colors.warning_medium,
      icon: theme.colors.warning_dark,
    },
  }[level][item]);

const getContainerStyles = (size: ErrorSize) =>
  ({
    [ERROR_SIZES.LG]: `
      padding: 1rem 60px 2rem 1rem;
      line-height: 26px;
    `,
    [ERROR_SIZES.MD]: `
      padding: 1rem 60px 1rem 1rem;
      line-height: 24px;
    `,
    [ERROR_SIZES.SM]: `
      padding: 0.5rem 60px 0.5rem 0.5rem;
      line-height: 20px;
      display: flex;
      align-items: center;
    `,
  }[size]);

const ErrorContentContainer = styled('div')<{ level: ErrorLevel; size: ErrorSize }>`
  ${({ level, size, theme }) => css`
    border: 1px solid ${getColors({ level, theme, item: 'border' })};
    border-radius: 5px;
    ${theme.shadow.default};
    ${theme.typography.subheading};
    font-weight: normal;
    background-color: ${getColors({ level, theme, item: 'background' })};
    color: ${theme.colors.black};
    ${getContainerStyles(size)};
  `}
`;

const getIconStyle = (size: ErrorSize) =>
  ({
    [ERROR_SIZES.LG]: 'padding-right: 15px',
    [ERROR_SIZES.MD]: 'padding-right: 15px',
    [ERROR_SIZES.SM]: '',
  }[size]);

const getTitleStyle = (size: ErrorSize) =>
  ({
    [ERROR_SIZES.LG]: `
      margin: 0.5rem 0 1rem;
      font-size: 24px;
      line-height: 38px;
    `,
    [ERROR_SIZES.MD]: `
      margin: 0rem;
      padding-bottom: 0.4rem;
      font-size: 18px;
      line-height: 20px;
    `,
    [ERROR_SIZES.SM]: `
      margin: 0rem,
      line-height: 16px;
    `,
  }[size]);

const ErrorTitle = styled('h1')`
  ${({ size }: { size: ErrorSize }) => css`
    display: flex;
    align-items: center;
    ${getTitleStyle(size)}
  `}
`;

const ErrorNotification = ({
  children,
  className,
  dismissible = false,
  level = ERROR_LEVELS.ERROR,
  onDismiss,
  size,
  title,
  ...props
}: {
  children: React.ReactNode;
  className?: string;
  dismissible?: boolean;
  level?: ErrorLevel;
  onDismiss?: Function;
  size: ErrorSize;
  styles?: string;
  title?: string;
}) => {
  const theme = useTheme();

  const clickHandler = (e: React.MouseEvent) => onDismiss?.();

  return (
    <div
      className={className}
      css={css`
        max-width: 600px;
        position: relative;
      `}
    >
      <ErrorContentContainer level={level} size={size}>
        {title ? (
          <div>
            <ErrorTitle size={size}>
              <ErrorIcon
                {...getIconDimensions(size)}
                style={css`
                  line-height: 16px;
                  ${getIconStyle(size)}
                `}
                fill={getColors({ level, theme, item: 'icon' })}
              />{' '}
              {title}
              {dismissible && <DismissIcon height={15} width={15} fill={theme.colors.black} />}
            </ErrorTitle>
            {children}
          </div>
        ) : (
          <div
            css={css`
              display: flex;
              flex-direction: row;
            `}
          >
            <span>
              <ErrorIcon
                {...getIconDimensions(size)}
                style={css`
                  ${getIconStyle(size)}
                `}
                fill={getColors({ level, theme, item: 'icon' })}
              />
            </span>
            <div
              css={css`
                margin-left: 10px;
                margin-right: 10px;
                display: flex;
                align-items: center;
                justify-content: center;
                ${getFontSize(size)}
              `}
            >
              {children}
            </div>
            {dismissible && (
              <div
                css={css`
                  position: absolute;
                  right: 16px;
                `}
              >
                <IconButton
                  onClick={clickHandler}
                  Icon={DismissIcon}
                  height={getDismissIconDimensions(size)}
                  width={getDismissIconDimensions(size)}
                  fill={theme.colors.black}
                />
              </div>
            )}
          </div>
        )}
      </ErrorContentContainer>
    </div>
  );
};

export default ErrorNotification;
