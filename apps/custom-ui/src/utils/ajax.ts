/***************
Arranger does not work with fetch lib right out of the box, so using this implementation from
https://github.com/IHCC-cohorts/ihcc-ui/blob/develop/src/pages/cohortRepo/arrangerFetcher/ajax.ts
for now
 ***************/

import axios from 'axios';

const ajax = axios.create();

ajax.interceptors.request.use(
	(config) => {
		// set Authorization headers on a per request basis
		// setting headers on axios get/put/post or common seems to be shared accross all axios instances
		if (config.headers) {
		config.headers = {
			...config.headers,
			} as typeof config.headers;
		}
		return config;
	},
	(err) => {
		return Promise.reject(err);
	},
);

export default ajax;





