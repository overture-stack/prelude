/*
 *
 * Copyright (c) 2022 The Ontario Institute for Cancer Research. All rights reserved
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
import { INTERNAL_API_PROXY } from '@/global/utils/constants';
import { SQONType } from '@overture-stack/arranger-components/dist/DataContext/types';
import SQON from '@overture-stack/sqon-builder';
import { isEmpty } from 'lodash';

export const arrangerFetcher = createArrangerFetcher({
	ARRANGER_API: INTERNAL_API_PROXY.DATATABLE_4_ARRANGER,
});

const saveSetMutation = `mutation ($sqon: JSON!)  {
    saveSet(
        sqon: $sqon,
        type: file,
        path: "name"
    ) {
        setId
    }
}`;

export const saveSet = (sqon: SQONType): Promise<string> => {
	return arrangerFetcher({
		body: {
			query: saveSetMutation,
			variables: { sqon },
		},
	})
		.then(
			({
				data: {
					saveSet: { setId },
				},
			}) => {
				return setId;
			},
		)
		.catch((err: Error) => {
			console.warn(err);
			return Promise.reject(err);
		});
};

// Type guard to check if SQON is not null
function isSQON(sqon: SQONType | null): sqon is SQONType {
	return sqon !== null && !isEmpty(sqon);
}

export function buildSqonWithObjectIds(currentSqon: SQONType, objectIds: string[]): SQONType {
	// Create object ID SQON only if we have IDs
	let objectsSqon: SQONType | null = null;
	if (objectIds.length > 0) {
		const builder = SQON.in('object_id', objectIds);
		objectsSqon = builder.toValue() as unknown as SQONType;
	}

	// If both SQONs are valid, combine them
	if (isSQON(currentSqon) && isSQON(objectsSqon)) {
		const sqonArray = [currentSqon, objectsSqon].map((sqon) => sqon as any);
		const builder = SQON.and(sqonArray);
		return builder.toValue() as unknown as SQONType;
	}

	// Return whichever SQON is valid, or null if neither is
	if (isSQON(currentSqon)) return currentSqon;
	if (isSQON(objectsSqon)) return objectsSqon;
	return null;
}
