/**
 * Server-side only — reads theme.config.json from disk.
 * Never import this statically in client-bundled files.
 * Use dynamic require() inside typeof window === 'undefined' guards instead.
 */

import fs from 'fs';
import path from 'path';
import type { ThemeConfig } from './themeConfig';

export function loadThemeConfig(): ThemeConfig {
	try {
		const configPath = path.join(process.cwd(), 'theme.config.json');
		if (!fs.existsSync(configPath)) return {};
		const raw = fs.readFileSync(configPath, 'utf8');
		return JSON.parse(raw) as ThemeConfig;
	} catch {
		return {};
	}
}
