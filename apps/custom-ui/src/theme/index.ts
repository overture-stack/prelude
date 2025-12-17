import colors from './colors';

const defaultTheme = {
    colors,
    shadow: {
        default: 'box-shadow: 0 0.125rem 0.25rem rgba(0, 0, 0, 0.1);',
        right: 'box-shadow: 0.125rem 0 0.25rem rgba(0, 0, 0, 0.1);',
    },
};

export default defaultTheme;
export type CustomUIThemeInterface = typeof defaultTheme;
