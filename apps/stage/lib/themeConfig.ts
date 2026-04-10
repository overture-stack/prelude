/**
 * Theme config types and pure merge utility — no Node.js APIs, safe to bundle for client.
 */

export interface ThemeConfig {
	colors?: Record<string, string>;
	fonts?: {
		base?: string;
		googleFontsUrl?: string;
	};
}

function deepMerge<T extends Record<string, any>>(target: T, source: Record<string, any>): T {
	const result: Record<string, any> = { ...target };
	for (const key in source) {
		if (
			source[key] !== null &&
			typeof source[key] === 'object' &&
			!Array.isArray(source[key]) &&
			typeof target[key] === 'object'
		) {
			result[key] = deepMerge(target[key], source[key]);
		} else if (source[key] !== undefined) {
			result[key] = source[key];
		}
	}
	return result as T;
}

export function applyThemeConfig<T extends Record<string, any>>(
	defaultTheme: T,
	config: ThemeConfig,
): T {
	if (!config || Object.keys(config).length === 0) return defaultTheme;
	return deepMerge(defaultTheme, config as Record<string, any>);
}
