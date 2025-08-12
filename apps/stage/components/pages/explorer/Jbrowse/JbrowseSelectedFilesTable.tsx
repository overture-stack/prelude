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

import ErrorNotification from '@/components/ErrorNotification';
import ExpandButton from '@/components/ExpandButton';
import { OverlayLoader } from '@/components/Loader';
import SimpleTable, { TableColumn, TableRecord } from '@/components/SimpleTable';
import createArrangerFetcher from '@/components/utils/arrangerFetcher';
import { css } from '@emotion/react';
import { useTableContext } from '@overture-stack/arranger-components';
import SQON from '@overture-stack/sqon-builder';
import { partition } from 'lodash';
import { useEffect, useState } from 'react';
import { JbrowseSelectedFilesQueryNode } from './types';
import { checkJbrowseCompatibility, jbrowseErrors, JbrowseTypeName } from './utils';

const arrangerFetcher = createArrangerFetcher({});

const jbrowseSelectedFilesTableQuery = `
query ($filters:JSON){
  file {
    hits (filters: $filters) {
      edges {
        node {
          data_type
          file_access
          file_type
          id
          study_id
          donors {
            hits {
              edges {
                node {
                  donor_id
                }
              }
            }
          }
          file {
            name
            size
            index_file {
              file_type
            }
          }
        }
      }
    }
  }
}
`;

const tableColumns: TableColumn[] = [
	{ key: 'data_type', name: 'Data Type' },
	{ key: 'donor_id', name: 'Donor ID' },
	{ key: 'file_access', name: 'File Access' },
	{ key: 'file_id', name: 'File ID' },
	{ key: 'file_name', name: 'File Name' },
	{ key: 'file_size', name: 'File Size' },
	{ key: 'file_type', name: 'File Type' },
	{ key: 'study_id', name: 'Study ID' },
];

const JbrowseSelectedFilesTable = ({
	activeJbrowseType,
}: {
	activeJbrowseType: JbrowseTypeName;
}) => {
	const { selectedRows } = useTableContext({
		callerName: 'JBrowse - Selected Files Table',
	});
	const [tableData, setTableData] = useState<TableRecord[]>([]);
	const [compatibilityWarnings, setCompatibilityWarnings] = useState<string[]>([]);
	const [showTable, setShowTable] = useState<boolean>(true);
	const [loading, setLoading] = useState<boolean>(true);
	const [error, setError] = useState<string>('');

	useEffect(() => {
		setLoading(true);
		// check if any files are incompatible with Jbrowse
		// then get table data for compatible/visualized files
		arrangerFetcher({
			endpoint: 'graphql/JbrowseTableQuery',
			body: JSON.stringify({
				variables: {
					filters: SQON.in('object_id', selectedRows),
				},
				query: jbrowseSelectedFilesTableQuery,
			}),
		})
			.then(({ data }) => {
				// get data for table
				const [compatibleFiles, incompatibleFiles] = partition(
					data.file?.hits?.edges || [],
					({
						node: {
							file_access,
							file_type,
							file: { index_file },
						},
					}: {
						node: JbrowseSelectedFilesQueryNode;
					}) =>
						checkJbrowseCompatibility({
							file_access,
							file_type,
							index_file,
							jbrowseType: activeJbrowseType,
						}),
				);

				const nextTableData = compatibleFiles.map(
					({ node }: { node: JbrowseSelectedFilesQueryNode }) => ({
						data_type: node.data_type,
						donor_id: node.donors.hits.edges[0].node.donor_id,
						file_access: node.file_access,
						file_id: node.id,
						file_name: node.file.name,
						file_size: node.file.size,
						file_type: node.file_type,
						study_id: node.study_id,
					}),
				);
				setTableData(nextTableData);

				const warnings = incompatibleFiles.map(
					({
						node: {
							file: { name },
						},
					}) => name,
				);
				setCompatibilityWarnings(warnings);
			})
			.catch(async (err) => {
				console.warn(err);
				setError(jbrowseErrors(activeJbrowseType).default);
			})
			.finally(() => {
				setLoading(false);
			});
	}, [selectedRows]);

	const dismissWarnings = () => setCompatibilityWarnings([]);

	return loading ? (
		<div
			css={css`
				position: relative;
			`}
		>
			<OverlayLoader minHeight={200} />
		</div>
	) : error ? (
		<div
			css={css`
				padding-top: 8px;
			`}
		>
			<ErrorNotification size="sm">{error}</ErrorNotification>
		</div>
	) : (
		<div
			css={css`
				margin-top: 20px;
			`}
		>
			{compatibilityWarnings.length > 0 && (
				<ErrorNotification
					size="sm"
					css={css`
						margin: 20px 0 10px;
						max-width: none;
					`}
					onDismiss={dismissWarnings}
					dismissible
					level="warning"
				>
					<div>
						The following files are not compatible with JBrowse:
						<ul
							css={css`
								margin: 0;
								padding-left: 15px;
							`}
						>
							{compatibilityWarnings.map((warning: string) => (
								<li key={warning}>{warning}</li>
							))}
						</ul>
					</div>
				</ErrorNotification>
			)}

			<div
				css={css`
					display: flex;
					align-items: center;
					justify-content: space-between;
					margin-bottom: 10px;
					margin-top: 20px;
				`}
			>
				<h3
					css={(theme) => css`
						${theme.typography.subheading};
						margin: 0;
					`}
				>
					{tableData.length} File{tableData.length === 1 ? '' : 's'} Selected
				</h3>
				<ExpandButton isOpen={showTable} onClick={() => setShowTable(!showTable)}>
					{showTable ? 'Hide' : 'Show'} Table
				</ExpandButton>
			</div>
			{showTable && <SimpleTable tableColumns={tableColumns} tableData={tableData} />}
		</div>
	);
};

export default JbrowseSelectedFilesTable;
