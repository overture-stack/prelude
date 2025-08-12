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

import { JbrowseFileAccess, JbrowseFileTypes } from './utils';

export type JbrowseQueryNode = {
	file_type: JbrowseFileTypes;
	object_id: string;
	file_access: JbrowseFileAccess;
	file: {
		index_file: null | { object_id: string; size: number };
		name: string;
		size: number;
	};
};

export type JbrowseSelectedFilesQueryNode = JbrowseQueryNode & {
	data_type: string;
	donors: { hits: { edges: { node: { donor_id: string } }[] } };
	file_type: string;
	file: { name: string; size: number };
	id: string;
	study_id: string;
};

export type ScoreDownloadParams = {
	'User-Agent': string;
	external: string;
	length: string;
	object_id: string;
	offset: string;
};

export type ScoreDownloadResult = {
	objectId: string;
	objectKey: string;
	objectMd5: string;
	objectSize: number;
	uploadId: string;
	parts: {
		md5: string | null;
		offset: number;
		partNumber: number;
		partSize: number;
		url: string;
	}[];
};

type JbrowseFileType = {
	fileType: string;
};

type JbrowseFileSize = {
	fileSize: number;
};

type JbrowseFileId = {
	fileId: string;
};

type JbrowseFileName = {
	fileName: string;
};

export type ScoreDownloadJbrowseInput = JbrowseFileSize &
	JbrowseFileId & {
		indexId: string;
		indexSize: number;
	};

export type JbrowseInput = JbrowseFileType &
	JbrowseFileName &
	JbrowseFileId & {
		fileURI: string;
		indexURI: string;
	};

export type JbrowseCompatibleFile = ScoreDownloadJbrowseInput & JbrowseFileName & JbrowseFileType;
