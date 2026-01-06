const convertToRegexPath = (path: string) => {
	const escapedPath = path.replaceAll('/', '\\/');
	return new RegExp(`^${escapedPath}\\/?`);
};

export const removeFromPath = (url: string, path: string) => {
	return url?.replace(convertToRegexPath(path), '') || '';
};

// Setting the NODE_TLS_REJECT_UNAUTHORIZED environment variable to '0' makes TLS connections
// and HTTPS requests insecure by disabling certificate verification
export const SSLSecured = !(Number(process.env.NODE_TLS_REJECT_UNAUTHORIZED) === 0);
