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

import { css } from '@emotion/react';
import {
  CountDisplay,
  useTableContext,
  MaxRowsSelector,
  PageSelector,
} from '@overture-stack/arranger-components';
import { useTheme } from '@emotion/react';

const TablePagination = () => {
  const { isLoading, selectedRows } = useTableContext({
    callerName: 'Table Pagination',
  });
  const theme = useTheme();
  const textCss = css`
    color: ${theme.colors.grey_6};
    font-size: 0.8rem;
    line-height: 16px;
  `;
  const selectedRowsCount = selectedRows.length;

  return isLoading ? null : (
    <div
      css={css`
        display: flex;
        justify-content: space-between;
        align-items: center;
      `}
    >
      <div
        css={css`
          display: flex;
          align-items: center;
        `}
      >
        <MaxRowsSelector
          css={[
            textCss,
            css`
              margin-left: 0.3rem;
              .Spinner {
                justify-content: space-between;
                width: 65%;
              }
              span:last-of-type {
                display: none;
              }
            `,
          ]}
        />
        <CountDisplay
          css={[
            textCss,
            css`
              margin-left: 10px;
              .Spinner {
                justify-content: space-between;
                width: 65%;
              }
            `,
          ]}
        />
        {!!selectedRowsCount && (
          <div
            css={[
              textCss,
              css`
                color: ${theme.colors.accent_dark};
                font-weight: bold;
                background: ${theme.colors.secondary_light};
                margin-left: 3px;
                padding: 2px;
              `,
            ]}
          >
            ({selectedRowsCount} file{selectedRowsCount === 1 ? '' : 's'} selected)
          </div>
        )}
      </div>
      <PageSelector />
    </div>
  );
};

export default TablePagination;
