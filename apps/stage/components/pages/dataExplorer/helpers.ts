/*
 *
 * Copyright (c) 2024 The Ontario Institute for Cancer Research. All rights reserved
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
import { SQONType } from '@overture-stack/arranger-components/dist/DataContext/types';
import SQON from '@overture-stack/sqon-builder';
import { isEmpty } from 'lodash';

/**
 * Creates a custom fetcher function for a specific Arranger API endpoint.
 *
 * Why we need this:
 * - Each data table connects to a different Arranger API
 * - This function creates a customized fetch function for that specific API
 *
 * @param arrangerApiUrl - The base URL of the Arranger API to connect to
 * @returns A fetch function configured for the specified API
 *
 * Example usage:
 * const fetcher = createDataExplorerFetcher('http://localhost:5050/api/datatable1')
 */
export const createDataExplorerFetcher = (arrangerApiUrl: string) => {
	return createArrangerFetcher({
		ARRANGER_API: arrangerApiUrl,
	});
};

/**
 * GraphQL mutation query to save a set of filtered results.
 * This is used when users want to save their current filter selection.
 */
const saveSetMutation = `mutation ($sqon: JSON!)  {
    saveSet(
        sqon: $sqon,
        type: file,
        path: "name"
    ) {
        setId
    }
}`;

/**
 * Saves a set of filtered results and returns a unique set ID.
 *
 * React/TypeScript Concepts:
 * - Generic function that can work with any fetcher
 * - Promise-based (async operation)
 * - Type-safe error handling
 *
 * @param sqon - The filter query (SQON = Structured Query Object Notation)
 * @param fetcher - The fetch function to use for the API call
 * @returns Promise that resolves to the saved set ID
 */
export const saveSet = (sqon: SQONType, fetcher: ReturnType<typeof createArrangerFetcher>): Promise<string> => {
	return fetcher({
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

/**
 * Type guard function to check if a value is a valid SQON object.
 *
 * TypeScript Concept: Type Guards
 * - A function that helps TypeScript narrow down types
 * - The return type 'sqon is SQONType' tells TypeScript that if this returns true,
 *   the parameter is definitely a SQONType (not null)
 *
 * @param sqon - The value to check
 * @returns true if sqon is a valid SQONType, false otherwise
 */
function isSQON(sqon: SQONType | null): sqon is SQONType {
	return sqon !== null && !isEmpty(sqon);
}

/**
 * Combines a current filter (SQON) with a list of object IDs.
 *
 * Why this is useful:
 * - Users might have existing filters applied
 * - Then they select specific rows by ID
 * - We need to combine both filters together
 *
 * React Concept: Immutable data
 * - We don't modify the original sqon
 * - We create and return a new combined sqon
 *
 * @param currentSqon - The existing filter state
 * @param objectIds - Array of specific object IDs to include
 * @returns Combined SQON that includes both filters
 */
export function buildSqonWithObjectIds(currentSqon: SQONType, objectIds: string[]): SQONType {
	// Create object ID SQON only if we have IDs
	let objectsSqon: SQONType | null = null;
	if (objectIds.length > 0) {
		const builder = SQON.in('object_id', objectIds);
		objectsSqon = builder.toValue() as unknown as SQONType;
	}

	// If both SQONs are valid, combine them with AND logic
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

/**
 * GraphQL query to check if Arranger has a valid configuration.
 * This runs on page load to verify the data table is properly set up.
 */
export const configValidationQuery = `
	query ($documentType: String!, $index: String!) {
		hasValidConfig (documentType: $documentType, index: $index)
	}
`;
