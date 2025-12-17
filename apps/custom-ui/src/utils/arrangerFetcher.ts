import urlJoin from 'url-join';
import ajax from './ajax';

const createArrangerFetcher = ({
	ARRANGER_API = 'http://noUrlProvided',
	onError = (err: any) => Promise.reject(err),
	defaultHeaders = {},
} = {}) => {
	const cache = new Map();

	return async (args: {
		body?: Record<string, any> | string | null;
		endpoint?: string;
		endpointTag?: string;
		headers?: Record<string, string>;
	}) => {
		const key = JSON.stringify(args);

		if (cache.has(key)) return cache.get(key);
		// TODO: max cache size

		const { body = {}, endpoint = '/graphql', endpointTag = '', headers = {} } = args;
		const uri = urlJoin(ARRANGER_API, endpoint, endpointTag);
		const response = await ajax
			.post(uri, body, {
				headers: {
					'Content-Type': 'application/json',
					...(defaultHeaders || {}),
					...headers,
				},
			})
			.then((response: { data: any }) => {
				return response.data;
			})
			.catch((err: { response: any }) => {
				return onError(err);
			});

		cache.set(key, response);

		return response;
	};
};

export default createArrangerFetcher;
