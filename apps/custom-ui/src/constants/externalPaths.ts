import urlJoin from 'url-join';

/* ******************* *
   EXTERNAL WEBSITE URLS
 * ******************* */

export const OICR_URL = 'https://oicr.on.ca/';
export const OICR_TERMS_URL = urlJoin(OICR_URL, 'terms-and-conditions');

export const OHCRN_PATHS = {
	ABOUT: 'about-us',
	CONTACT: 'contact-us',
	HELP: 'faq',
	PRIVACY: 'about-us/privacy-policy',
};

// Default OHCRN home link - can be overridden via environment variable
export const getOHCRNHomeLink = (): string => {
	return import.meta.env.VITE_OHCRN_HOME_LINK || '';
};

