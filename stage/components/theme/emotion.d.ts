import '@emotion/react';
import { StageThemeInterface } from '.';

declare module '@emotion/react' {
	export interface Theme extends StageThemeInterface {}
}
