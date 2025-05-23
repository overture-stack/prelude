import React from 'react';
import { css, useTheme } from '@emotion/react';
import { SQON } from '@overture-stack/sqon-builder';
import { withData } from '@overture-stack/arranger-components/dist/DataContext';
import stringify from 'fast-json-stable-stringify';
import { InternalLink, StyledLinkAsButton } from '@/components/Link';
import { INTERNAL_PATHS } from '@/global/utils/constants';

interface CrossTableFilterButtonProps {
  sqon?: SQON;
  targetPath?: string;
  disabledText?: string;
  enabledText?: string;
}

// Helper function to check if SQON has active filters
const hasActiveFilters = (sqon?: SQON): boolean => {
  if (!sqon) return false;
  
  // Check if sqon has a content array with at least one item
  if (sqon.content && Array.isArray(sqon.content) && sqon.content.length > 0) {
    return true;
  }
  
  return false;
};

/**
 * A generic button component that applies filters from one table to another
 * Only becomes active when filters are selected
 */
const CrossTableFilterButton = withData(({ 
  sqon, 
  targetPath = INTERNAL_PATHS.DATATABLE_2,
  disabledText = 'Apply filters to target table', 
  enabledText = 'Apply filter(s) to target table',
}: CrossTableFilterButtonProps) => {
  const hasFilters = hasActiveFilters(sqon);
  const urlParams = hasFilters ? new URLSearchParams({ filters: stringify(sqon) }).toString() : '';
  const theme = useTheme();

  // Common styles for both states
  const commonStyles = css`
    background-color: ${theme.colors.primary_dark || '#043565'};
    padding: 10px 20px;
    margin-bottom: 8px;
    font-size: 14px;
    font-weight: 500;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    white-space: nowrap;
    border: none;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    height: 20px; 
  `;

  // If no filters are selected, render a disabled button
  if (!hasFilters) {
    return (
      <div
        css={css`
          ${commonStyles}
          color: ${theme.colors.black};
          background-color: ${theme.colors.grey_3};
          cursor: not-allowed;
          opacity: 0.666;
        `}
      >
        {disabledText}
      </div>
    );
  }

  // If filters are selected, render an active button
  return (
    <InternalLink path={`${targetPath}?${urlParams}`}>
      <StyledLinkAsButton
        css={css`
          ${commonStyles}
          color: ${theme.colors.white || 'white'};
          cursor: pointer;
          transition: background-color 0.2s ease;
          &:hover {
            background-color: ${theme.colors.primary || '#163848'};
          }
        `}
      >
        {enabledText}
      </StyledLinkAsButton>
    </InternalLink>
  );
});

export default CrossTableFilterButton;