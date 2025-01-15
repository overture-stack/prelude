import { getConfig } from '@/global/config';

const { NEXT_PUBLIC_KEYCLOAK_PERMISSION_AUDIENCE } = getConfig();

export const permissionBodyParams = () => {
	return new URLSearchParams({
		grant_type: 'urn:ietf:params:oauth:grant-type:uma-ticket',
		audience: NEXT_PUBLIC_KEYCLOAK_PERMISSION_AUDIENCE,
		response_mode: 'permissions',
	});
};

export type Permission = {
	rsid: string;
	rsname: string;
	scopes: string[];
};

export const scopesFromPermissions = (permissions: Permission[]) => {
	return permissions
		.filter(({ scopes }) => scopes)
		.flatMap(({ rsname, scopes }) => scopes.flatMap((scope) => [rsname + '.' + scope]));
};
