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

import urlJoin from 'url-join';

import { getConfig } from '../config';

const { NEXT_PUBLIC_KEYCLOAK_HOST, NEXT_PUBLIC_KEYCLOAK_REALM } = getConfig();

export const EXPLORER_PATH = '/explorer';
export const USER_PATH = '/user';
export const LOGIN_PATH = '/login';

export const ROOT_PATH = '/';

export enum INTERNAL_PATHS {
	MOLECULAR = '/molecular',
	DATATABLE_1 = '/dataTableOne',
	DATATABLE_2 = '/dataTableTwo',
	DATATABLE_3 = '/dataTableThree',
	DATATABLE_4 = '/dataTableFour',
	DATATABLE_5 = '/dataTableFive',
	HOME = '/home',
	DOCUMENTATION = '/documentation',
	SONG = '/swaggerDocs/song',
	LYRIC = '/swaggerDocs/lyric',
	LECTERN = '/swaggerDocs/lectern',
	SCORE = '/swaggerDocs/score',
}

// external Swagger links
export const LECTERN_SWAGGER = 'http://localhost:3031/api-docs';
export const LYRIC_SWAGGER = 'http://localhost:3030/api-docs';
export const SONG_SWAGGER = 'http://localhost:8080/swagger-ui.html';
export const SCORE_SWAGGER = 'http://localhost:8087/swagger-ui.html';

// external docs links
export const HELP_URL = 'https://github.com/overture-stack/docs/discussions/new?category=support';
export const EMAIL_SETTING_URL = 'admin@example.com';
export const DOCS_URL = 'https://docs.overture.bio';

// keycloak
export const KEYCLOAK_URL_ISSUER = urlJoin(NEXT_PUBLIC_KEYCLOAK_HOST, 'realms', NEXT_PUBLIC_KEYCLOAK_REALM);
export const KEYCLOAK_URL_TOKEN = urlJoin(KEYCLOAK_URL_ISSUER, 'protocol/openid-connect/token');
export const KEYCLOAK_API_KEY_ENDPOINT = urlJoin(KEYCLOAK_URL_ISSUER, 'apikey/api_key');

export const AUTH_PROVIDER = {
	KEYCLOAK: 'keycloak',
};

const PROXY_API_PATH = '/api';
const PROXY_PROTECTED_API_PATH = '/api/protected';

export const INTERNAL_API_PROXY = {
	DATATABLE_1_ARRANGER: urlJoin(PROXY_API_PATH, 'dataset_1_arranger'),
	DATATABLE_2_ARRANGER: urlJoin(PROXY_API_PATH, 'dataset_2_arranger'),
	DATATABLE_3_ARRANGER: urlJoin(PROXY_API_PATH, 'dataset_3_arranger'),
	DATATABLE_4_ARRANGER: urlJoin(PROXY_API_PATH, 'dataset_4_arranger'),
	DATATABLE_5_ARRANGER: urlJoin(PROXY_API_PATH, 'dataset_5_arranger'),
	MOLECULAR_ARRANGER: urlJoin(PROXY_API_PATH, 'molecular_arranger'),
	PROTECTED_ARRANGER: urlJoin(PROXY_PROTECTED_API_PATH, 'arranger'),
	PROTECTED_KEYCLOAK_APIKEY_ENDPOINT: urlJoin(PROXY_PROTECTED_API_PATH, 'keycloak/apikey'),
	PROTECTED_KEYCLOAK_TOKEN_ENDPOINT: urlJoin(PROXY_PROTECTED_API_PATH, 'keycloak/token'),
	SONG: urlJoin(PROXY_API_PATH, 'song'),
} as const;
