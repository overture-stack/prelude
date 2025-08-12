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

import createArrangerFetcher from '@/components/utils/arrangerFetcher';
import { useTableContext } from '@overture-stack/arranger-components';
import SQON from '@overture-stack/sqon-builder';
import { useEffect, useState } from 'react';
import { JbrowseQueryNode } from './types';
import {
	checkJbrowseCompatibility,
	jbrowseErrors,
	JbrowseTypeName,
	JbrowseTypeNames,
	MAX_JBROWSE_FILES,
} from './utils';

const arrangerFetcher = createArrangerFetcher({});

const jbrowseCompatibilityQuery = `
  query tableData($filters: JSON) {
  file {
    hits(filters: $filters) {
      edges {
        node {
          file_access
          file_type
          file {
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

const useJbrowseCompatibility = () => {
	const { selectedRows } = useTableContext({
		callerName: 'Jbrowse - Compatibility Check',
	});
	const [jbrowseLoading, setJbrowseLoading] = useState<boolean>(false);
	const [jbrowseCircularError, setJbrowseCircularError] = useState<string>('');
	const [jbrowseLinearError, setJbrowseLinearError] = useState<string>('');

	const resolveJbrowse = ({
		circularError = '',
		linearError = '',
	}: {
		circularError?: string;
		linearError?: string;
	}) => {
		setJbrowseCircularError(circularError);
		setJbrowseLinearError(linearError);
		setJbrowseLoading(false);
	};

	useEffect(() => {
		// check if conditions are met to launch jbrowse
		setJbrowseLoading(true);
		setJbrowseCircularError('');
		setJbrowseLinearError('');

		// check if # of selectedRows is in acceptable range
		const selectedRowsCount = selectedRows.length;

		if (selectedRowsCount === 0) {
			resolveJbrowse({
				circularError: jbrowseErrors(JbrowseTypeNames.JBROWSE_CIRCULAR).selectedFilesUnderLimit,
				linearError: jbrowseErrors(JbrowseTypeNames.JBROWSE_LINEAR).selectedFilesUnderLimit,
			});
		} else if (selectedRowsCount > MAX_JBROWSE_FILES) {
			resolveJbrowse({
				circularError: jbrowseErrors(JbrowseTypeNames.JBROWSE_CIRCULAR).selectedFilesOverLimit,
				linearError: jbrowseErrors(JbrowseTypeNames.JBROWSE_LINEAR).selectedFilesOverLimit,
			});
		} else {
			// check if # of compatible files is in acceptable range
			arrangerFetcher({
				endpoint: 'graphql/JbrowseCompatibilityQuery',
				body: JSON.stringify({
					variables: {
						filters: SQON.in('object_id', selectedRows),
					},
					query: jbrowseCompatibilityQuery,
				}),
			})
				.then(async ({ data }) => {
					const getCompatibleFilesCount = (jbrowseType: JbrowseTypeName) =>
						(data.file?.hits?.edges || []).filter(
							({
								node: {
									file_access,
									file_type,
									file: { index_file },
								},
							}: {
								node: JbrowseQueryNode;
							}) =>
								checkJbrowseCompatibility({
									file_access,
									file_type,
									index_file,
									jbrowseType,
								}),
						).length;

					const errorsUnderLimit = {
						...(getCompatibleFilesCount(JbrowseTypeNames.JBROWSE_LINEAR) === 0
							? {
									linearError: jbrowseErrors(JbrowseTypeNames.JBROWSE_LINEAR)
										.compatibleFilesUnderLimit,
							  }
							: {}),
						...(getCompatibleFilesCount(JbrowseTypeNames.JBROWSE_CIRCULAR) === 0
							? {
									circularError: jbrowseErrors(JbrowseTypeNames.JBROWSE_CIRCULAR)
										.compatibleFilesUnderLimit,
							  }
							: {}),
					};

					resolveJbrowse(errorsUnderLimit);
				})
				.catch(async (err: Error) => {
					const errorsDefault = {
						circularError: jbrowseErrors(JbrowseTypeNames.JBROWSE_CIRCULAR).default,
						linearError: jbrowseErrors(JbrowseTypeNames.JBROWSE_LINEAR).default,
					};
					resolveJbrowse(errorsDefault);
					console.error(err);
				});
		}
	}, [selectedRows]);

	return {
		jbrowseCircularError,
		jbrowseLinearError,
		jbrowseLoading,
	};
};

export default useJbrowseCompatibility;
