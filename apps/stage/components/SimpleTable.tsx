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

import { ReactElement } from 'react';
import styled from '@emotion/styled';
import { css } from '@emotion/react';
import defaultTheme from './theme';

export type TableColumn = { name: string; key: string };
export type TableRecord = Record<string, string | number>;

// this table is for displaying simple data without
// setting up a TableContextProvider

const TableStyled = styled('table')`
  ${({ theme }: { theme: typeof defaultTheme }) => css`
    ${theme.typography.data};
    border: 1px solid ${theme.colors.grey_3};
    border-collapse: collapse;
    width: 100%;
  `}
`;

const ThStyled = styled('th')`
  ${({ theme }: { theme: typeof defaultTheme }) => css`
    font-weight: bold;
    text-align: left;
    border: 1px solid ${theme.colors.grey_3};
    padding: 6px 8px;
  `};
`;

const TdStyled = styled('td')`
  ${({ theme }: { theme: typeof defaultTheme }) => css`
    position: relative;
    padding: 6px 8px;
    border: 1px solid ${theme.colors.grey_3};
  `};
`;

const TrStyled = styled('tr')`
  ${({ theme }: { theme: typeof defaultTheme }) => css`
    padding: 2px 0;
    &:nth-of-type(even) {
      background: ${theme.colors.grey_1};
    }
  `};
`;

const SimpleTable = ({
  tableColumns,
  tableData,
}: {
  tableColumns: TableColumn[];
  tableData: TableRecord[];
}): ReactElement => {
  return tableColumns.length && tableData.length ? (
    <div
      css={css`
        width: 100%;
        max-width: 100%;
        overflow-x: auto;
      `}
    >
      <TableStyled>
        <thead>
          <TrStyled>
            {tableColumns.map((column) => (
              <ThStyled key={column.key}>{column.name}</ThStyled>
            ))}
          </TrStyled>
        </thead>
        <tbody>
          {tableData.map((row: TableRecord) => (
            <TrStyled key={row.file_id}>
              {Object.entries(row).map(([key, value]) => (
                <TdStyled key={key}>{value}</TdStyled>
              ))}
            </TrStyled>
          ))}
        </tbody>
      </TableStyled>
    </div>
  ) : (
    <></>
  );
};

export default SimpleTable;
