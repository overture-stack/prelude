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

import urlJoin from 'url-join';
import { getConfig } from '@/global/config';
import { jbrowseAssemblyName, jbrowseAssemblyAlias } from './utils';

const { NEXT_PUBLIC_JBROWSE_GENOME_URL_ROOT, NEXT_PUBLIC_JBROWSE_GENOME_ALIASES_URL_ROOT } =
  getConfig();

export const jbrowseAssemblyObject = {
  name: jbrowseAssemblyName,
  aliases: [jbrowseAssemblyAlias],
  sequence: {
    type: 'ReferenceSequenceTrack',
    trackId: `${jbrowseAssemblyAlias}-ReferenceSequenceTrack`,
    adapter: {
      type: 'BgzipFastaAdapter',
      fastaLocation: {
        uri: urlJoin(NEXT_PUBLIC_JBROWSE_GENOME_URL_ROOT, `${jbrowseAssemblyName}.prefix.fa.gz`),
        locationType: 'UriLocation',
      },
      faiLocation: {
        uri: urlJoin(
          NEXT_PUBLIC_JBROWSE_GENOME_URL_ROOT,
          `${jbrowseAssemblyName}.prefix.fa.gz.fai`,
        ),
        locationType: 'UriLocation',
      },
      gziLocation: {
        uri: urlJoin(
          NEXT_PUBLIC_JBROWSE_GENOME_URL_ROOT,
          `${jbrowseAssemblyName}.prefix.fa.gz.gzi`,
        ),
        locationType: 'UriLocation',
      },
    },
  },
  refNameAliases: {
    adapter: {
      type: 'RefNameAliasAdapter',
      location: {
        uri: urlJoin(
          NEXT_PUBLIC_JBROWSE_GENOME_ALIASES_URL_ROOT,
          jbrowseAssemblyAlias,
          `${jbrowseAssemblyName}_aliases.txt`,
        ),
        locationType: 'UriLocation',
      },
    },
  },
};
