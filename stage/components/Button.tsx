import React, { ReactNode, ReactNodeArray } from 'react';
import { css } from '@emotion/react';
import styled from '@emotion/styled';

import defaultTheme from './theme';
import { Spinner } from './theme/icons';

export const UnStyledButton = styled('button')`
  background: transparent;
  border: none;
  cursor: pointer;
  display: inline-flex;
  justify-content: center;
  align-items: center;
  padding: 0;
  position: relative;
  width: fit-content;
`;

export const ButtonElement = styled(UnStyledButton)`
  ${({ theme }: { theme?: typeof defaultTheme }) => css`
    color: ${theme?.colors.white};
    background-color: ${theme?.colors.primary};
    ${theme?.typography.subheading2};
    line-height: 24px;
    border-radius: 0px;
    border: 1px solid ${theme?.colors.primary};
    box-sizing: border-box;
    padding: 6px 15px;
    &:hover {
      background-color: ${theme?.colors.primary_dark};
    }
    &:disabled,
    &:disabled:hover {
      background-color: ${theme?.colors.grey_4};
      cursor: not-allowed;
      color: ${theme?.colors.white};
      border: 1px solid ${theme?.colors.grey_4};
    }
  `}
`;

interface ButtonProps {
  children?: ReactNode | ReactNodeArray;
  disabled?: boolean;
  onClick?: (
    e: React.SyntheticEvent<HTMLButtonElement>,
  ) => any | ((e: React.SyntheticEvent<HTMLButtonElement>) => Promise<any>);
  isAsync?: boolean;
  className?: string;
  isLoading?: boolean;
  title?: string;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>((props, ref) => {
  const {
    children,
    onClick = () => {},
    disabled = false,
    isAsync = false,
    className,
    isLoading: controlledLoadingState,
    title,
  } = props;

  const [isLoading, setLoading] = React.useState(false);

  /**
   * controlledLoadingState will allows consumer to control the loading state.
   * Else, that is set by the component internally
   */
  const shouldShowLoading = !!controlledLoadingState || (isLoading && isAsync);

  const onClickFn = async (event: React.SyntheticEvent<HTMLButtonElement>) => {
    setLoading(true);
    await onClick(event);
    setLoading(false);
  };

  return (
    <ButtonElement
      ref={ref}
      onClick={isAsync ? onClickFn : onClick}
      disabled={disabled || shouldShowLoading}
      className={className}
      title={title}
    >
      <span
        css={css`
          visibility: ${shouldShowLoading ? 'hidden' : 'visible'};
        `}
      >
        {children}
      </span>

      {isAsync && (
        <span
          css={css`
            position: absolute;
            visibility: ${shouldShowLoading ? 'visible' : 'hidden'};
            bottom: 1px;
          `}
        >
          <Spinner height={20} width={20} />
        </span>
      )}
    </ButtonElement>
  );
});

Button.displayName = 'Button';

export const TransparentButton = styled(ButtonElement)`
  background: none;
  border: none;
  justify-content: flex-start;
  text-align: left;

  &:focus,
  &:hover {
    background: none;
  }
`;

export default Button;