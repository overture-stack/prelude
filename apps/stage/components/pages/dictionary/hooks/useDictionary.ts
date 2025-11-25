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

import { useEffect, useState } from 'react';
// @ts-ignore - using internal path
import type { Dictionary } from '@overture-stack/lectern-dictionary';

interface UseDictionaryResult {
	dictionary: Dictionary | null;
	loading: boolean;
	error: string | null;
}

/**
 * Custom hook to fetch and manage dictionary data
 *
 * @param dictionaryUrl - URL to the static dictionary JSON file
 * @returns Dictionary data, loading state, and error state
 *
 * @example
 * ```tsx
 * const { dictionary, loading, error } = useDictionary('/dictionary/dictionary.json');
 *
 * if (loading) return <div>Loading...</div>;
 * if (error) return <div>Error: {error}</div>;
 * return <DictionaryView dictionary={dictionary} />;
 * ```
 */
export const useDictionary = (dictionaryUrl: string): UseDictionaryResult => {
	const [dictionary, setDictionary] = useState<Dictionary | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const fetchDictionary = async () => {
			try {
				setLoading(true);
				const response = await fetch(dictionaryUrl);
				if (!response.ok) {
					throw new Error(`Failed to fetch dictionary: ${response.status}`);
				}
				const data = await response.json();
				setDictionary(data);
				setError(null);
			} catch (err) {
				setError(err instanceof Error ? err.message : 'Failed to load dictionary');
				setDictionary(null);
			} finally {
				setLoading(false);
			}
		};

		fetchDictionary();
	}, [dictionaryUrl]);

	return { dictionary, loading, error };
};
