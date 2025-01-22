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

import React, { createContext, useEffect, useState } from 'react';

import { getConfig } from '../config';
import { ProviderType, UserStatus, UserType, UserWithId } from '../types/types';
import { AUTH_PROVIDER } from '../utils/constants';

type T_AuthContext = {
	user?: UserWithId;
};

const AuthContext = createContext<T_AuthContext>({
	user: undefined,
});

if (process.env.NODE_ENV === 'development') {
	AuthContext.displayName = 'AuthContext';
}

export const AuthProvider = ({ children, session }: { children: React.ReactElement; session: any }) => {
	const { NEXT_PUBLIC_AUTH_PROVIDER } = getConfig();
	const [user, setUser] = useState<UserWithId>();

	useEffect(() => {
		if (NEXT_PUBLIC_AUTH_PROVIDER === AUTH_PROVIDER.KEYCLOAK && session?.account) {
			const newUser: UserWithId = {
				id: session?.user?.id,
				email: session?.user?.email,
				type: UserType.USER,
				status: UserStatus.APPROVED,
				firstName: session?.user?.firstName,
				lastName: session?.user?.lastName,
				createdAt: 0,
				lastLogin: 0,
				providerType: ProviderType.KEYCLOAK,
				providerSubjectId: '',
				scope: session?.scopes,
			};
			setUser(newUser);
		}
	}, [session]);

	const authData = {
		user,
	};

	return <AuthContext.Provider value={authData}>{children}</AuthContext.Provider>;
};

export default function useAuthContext() {
	return React.useContext(AuthContext);
}
