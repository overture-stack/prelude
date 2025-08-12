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

import { Values } from '@/global/utils/typeUtils';
import { find } from 'lodash';
import {
	RepositoryTabKey,
	RepositoryTabKeys,
	RepositoryTabName,
	RepositoryTabNames,
} from '../RepositoryTabsContext';

export type JbrowseFileTypes = 'BAM' | 'VCF';
export type JbrowseFileAccess = 'open' | 'controlled';

export const JbrowseTypeNames = {
	JBROWSE_CIRCULAR: 'jbrowseCircular',
	JBROWSE_LINEAR: 'jbrowseLinear',
} as const;
export type JbrowseTypeName = Values<typeof JbrowseTypeNames>;

export const JbrowseTitles = {
	JBROWSE_CIRCULAR: 'Circular View',
	JBROWSE_LINEAR: 'Linear View',
} as const;
export type JbrowseTitle = Values<typeof JbrowseTitles>;

// custom type guard. returns true if input is a JbrowseTypeName.
export const isJbrowseTypeName = (input?: string): input is JbrowseTypeName =>
	!!input && Object.values(JbrowseTypeNames).includes(input as JbrowseTypeName);

export const jbrowseDict: {
	allowedFileTypes: JbrowseFileTypes[];
	jbrowseType: JbrowseTypeName;
	tabKey: RepositoryTabKey;
	tabName: RepositoryTabName;
	title: JbrowseTitle;
}[] = [
	{
		allowedFileTypes: ['VCF'],
		jbrowseType: JbrowseTypeNames.JBROWSE_CIRCULAR,
		tabKey: RepositoryTabKeys.JBROWSE_CIRCULAR,
		tabName: RepositoryTabNames.GENOME_VIEWER,
		title: JbrowseTitles.JBROWSE_CIRCULAR,
	},
	{
		allowedFileTypes: ['BAM', 'VCF'],
		jbrowseType: JbrowseTypeNames.JBROWSE_LINEAR,
		tabKey: RepositoryTabKeys.JBROWSE_LINEAR,
		tabName: RepositoryTabNames.GENOME_VIEWER,
		title: JbrowseTitles.JBROWSE_LINEAR,
	},
];

export const MAX_JBROWSE_FILES = 5;

export const jbrowseAssemblyName = 'hg38';
export const jbrowseAssemblyAlias = 'GRCh38';

export const jbrowseErrors = (jbrowseType: JbrowseTypeName) => ({
	selectedFilesUnderLimit: `0 files have been selected. Please select 1-${MAX_JBROWSE_FILES} files to launch JBrowse.`,
	selectedFilesOverLimit: `Too many files have been selected. A maximum of ${MAX_JBROWSE_FILES} files may be selected at once.`,
	compatibleFilesUnderLimit: `Please select 1 to ${MAX_JBROWSE_FILES} files to launch JBrowse. Supported file types: ${find(
		jbrowseDict,
		{ jbrowseType },
	)?.allowedFileTypes.join(', ')}. Index files are required.`,
	default: 'Something went wrong.',
});

export const jbrowseFileMetadataQuery = `
  query tableData($filters: JSON) {
  file {
    hits(filters: $filters) {
      edges {
        node {
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

// check if file is the right type for jbrowse
// and that it has an index
// MVP: restrict controlled access files
export const checkJbrowseCompatibility = ({
	file_access,
	file_type,
	index_file,
	jbrowseType,
}: {
	file_access: JbrowseFileAccess;
	file_type: JbrowseFileTypes;
	index_file: null | Record<string, any>;
	jbrowseType: JbrowseTypeName;
}) =>
	find(jbrowseDict, { jbrowseType })?.allowedFileTypes.includes(file_type) &&
	index_file !== null &&
	file_access === 'open';
