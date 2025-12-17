/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly VITE_ARRANGER_API: string;
	readonly VITE_DOCUMENT_TYPE: string;
	readonly VITE_INDEX_NAME: string;
	readonly VITE_OHCRN_HOME_LINK: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}






