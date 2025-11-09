/**
 * Theme configuration for Jitte
 * Supports Tokyo Night, Kanagawa, and Rose Pine themes with light/dark variants
 */

export type ThemeName = 'tokyo-night' | 'kanagawa' | 'rose-pine';
export type ThemeMode = 'light' | 'dark';

export interface ThemeColors {
	// Primary backgrounds
	'bg-primary': string;
	'bg-secondary': string;
	'bg-tertiary': string;
	'bg-elevated': string;

	// Surface colors
	surface: string;
	'surface-hover': string;
	'surface-active': string;

	// Border colors
	border: string;
	'border-light': string;
	'border-focus': string;

	// Text colors
	'text-primary': string;
	'text-secondary': string;
	'text-tertiary': string;
	'text-muted': string;

	// Brand/accent colors
	'brand-primary': string;
	'brand-secondary': string;
	'brand-tertiary': string;

	// Semantic colors
	'accent-blue': string;
	'accent-green': string;
	'accent-red': string;
	'accent-yellow': string;
	'accent-purple': string;
	'accent-cyan': string;

	// Status colors
	success: string;
	warning: string;
	error: string;
	info: string;
}

/**
 * Tokyo Night Theme - Dark variant
 * Based on base16 Tokyo Night Dark by Michaël Ball
 */
const tokyoNightDark: ThemeColors = {
	// Backgrounds (base00, base01, base02)
	'bg-primary': '#1A1B26',
	'bg-secondary': '#16161E',
	'bg-tertiary': '#2F3549',
	'bg-elevated': '#444B6A',

	// Surfaces
	surface: '#2F3549',
	'surface-hover': '#444B6A',
	'surface-active': '#565f89',

	// Borders
	border: '#444B6A',
	'border-light': '#787C99',
	'border-focus': '#2AC3DE',

	// Text (base05, base04, base03)
	'text-primary': '#A9B1D6',
	'text-secondary': '#787C99',
	'text-tertiary': '#444B6A',
	'text-muted': '#2F3549',

	// Brand (base0D, base0C)
	'brand-primary': '#2AC3DE',
	'brand-secondary': '#B4F9F8',
	'brand-tertiary': '#0DB9D7',

	// Accents (base08-base0F)
	'accent-blue': '#2AC3DE',
	'accent-green': '#9ECE6A',
	'accent-red': '#F7768E',
	'accent-yellow': '#0DB9D7',
	'accent-purple': '#BB9AF7',
	'accent-cyan': '#B4F9F8',

	// Status
	success: '#9ECE6A',
	warning: '#0DB9D7',
	error: '#F7768E',
	info: '#2AC3DE'
};

/**
 * Tokyo Night Theme - Light variant
 * Based on base16 Tokyo Night Light by Michaël Ball
 */
const tokyoNightLight: ThemeColors = {
	// Backgrounds (base00, base01, base02)
	'bg-primary': '#D5D6DB',
	'bg-secondary': '#CBCCD1',
	'bg-tertiary': '#DFE0E5',
	'bg-elevated': '#DFE0E5',

	// Surfaces
	surface: '#CBCCD1',
	'surface-hover': '#DFE0E5',
	'surface-active': '#9699A3',

	// Borders
	border: '#9699A3',
	'border-light': '#4C505E',
	'border-focus': '#34548A',

	// Text (base05, base04, base03)
	'text-primary': '#343B59',
	'text-secondary': '#4C505E',
	'text-tertiary': '#9699A3',
	'text-muted': '#CBCCD1',

	// Brand (base0D, base0A)
	'brand-primary': '#34548A',
	'brand-secondary': '#166775',
	'brand-tertiary': '#3E6968',

	// Accents (base08-base0F)
	'accent-blue': '#34548A',
	'accent-green': '#485E30',
	'accent-red': '#8C4351',
	'accent-yellow': '#166775',
	'accent-purple': '#5A4A78',
	'accent-cyan': '#3E6968',

	// Status
	success: '#485E30',
	warning: '#965027',
	error: '#8C4351',
	info: '#166775'
};

/**
 * Kanagawa Theme - Dark variant (Wave)
 * Based on base16 Kanagawa by Tommaso Laurenzi
 */
const kanagawaDark: ThemeColors = {
	// Backgrounds (base00, base01, base02)
	'bg-primary': '#1F1F28',
	'bg-secondary': '#16161D',
	'bg-tertiary': '#223249',
	'bg-elevated': '#223249',

	// Surfaces
	surface: '#223249',
	'surface-hover': '#54546D',
	'surface-active': '#727169',

	// Borders
	border: '#54546D',
	'border-light': '#727169',
	'border-focus': '#7E9CD8',

	// Text (base05, base06, base04, base03)
	'text-primary': '#DCD7BA',
	'text-secondary': '#C8C093',
	'text-tertiary': '#727169',
	'text-muted': '#54546D',

	// Brand (base0D, base0C)
	'brand-primary': '#7E9CD8',
	'brand-secondary': '#6A9589',
	'brand-tertiary': '#76946A',

	// Accents (base08-base0F)
	'accent-blue': '#7E9CD8',
	'accent-green': '#76946A',
	'accent-red': '#C34043',
	'accent-yellow': '#C0A36E',
	'accent-purple': '#957FB8',
	'accent-cyan': '#6A9589',

	// Status
	success: '#76946A',
	warning: '#FFA066',
	error: '#C34043',
	info: '#7E9CD8'
};

/**
 * Kanagawa Theme - Light variant (Dragon - using as light variant)
 * Based on base16 Kanagawa Dragon by Tommaso Laurenzi
 * Note: Official Lotus theme not in base16, using Dragon as alternative
 */
const kanagawaLight: ThemeColors = {
	// Backgrounds (base00, base01, base02)
	'bg-primary': '#c5c9c5',
	'bg-secondary': '#a6a69c',
	'bg-tertiary': '#737c73',
	'bg-elevated': '#a6a69c',

	// Surfaces
	surface: '#a6a69c',
	'surface-hover': '#737c73',
	'surface-active': '#282727',

	// Borders
	border: '#737c73',
	'border-light': '#282727',
	'border-focus': '#8ba4b0',

	// Text (base05, base04, base03) - inverted for light theme
	'text-primary': '#0d0c0c',
	'text-secondary': '#1D1C19',
	'text-tertiary': '#282727',
	'text-muted': '#737c73',

	// Brand (base0D, base0C)
	'brand-primary': '#8ba4b0',
	'brand-secondary': '#8ea4a2',
	'brand-tertiary': '#87a987',

	// Accents (base08-base0F)
	'accent-blue': '#8ba4b0',
	'accent-green': '#87a987',
	'accent-red': '#c4746e',
	'accent-yellow': '#c4b28a',
	'accent-purple': '#8992a7',
	'accent-cyan': '#8ea4a2',

	// Status
	success: '#87a987',
	warning: '#b98d7b',
	error: '#c4746e',
	info: '#8ba4b0'
};

/**
 * Rose Pine Theme - Dark variant (Main)
 * Based on base16 Rosé Pine by Emilia Dunfelt
 */
const rosePineDark: ThemeColors = {
	// Backgrounds (base00, base01, base02)
	'bg-primary': '#191724',
	'bg-secondary': '#1f1d2e',
	'bg-tertiary': '#26233a',
	'bg-elevated': '#26233a',

	// Surfaces
	surface: '#1f1d2e',
	'surface-hover': '#26233a',
	'surface-active': '#6e6a86',

	// Borders
	border: '#6e6a86',
	'border-light': '#908caa',
	'border-focus': '#c4a7e7',

	// Text (base05, base04, base03)
	'text-primary': '#e0def4',
	'text-secondary': '#908caa',
	'text-tertiary': '#6e6a86',
	'text-muted': '#524f67',

	// Brand (base0D, base0E)
	'brand-primary': '#c4a7e7',
	'brand-secondary': '#f6c177',
	'brand-tertiary': '#9ccfd8',

	// Accents (base08-base0F)
	'accent-blue': '#31748f',
	'accent-green': '#9ccfd8',
	'accent-red': '#eb6f92',
	'accent-yellow': '#ebbcba',
	'accent-purple': '#c4a7e7',
	'accent-cyan': '#9ccfd8',

	// Status
	success: '#31748f',
	warning: '#f6c177',
	error: '#eb6f92',
	info: '#c4a7e7'
};

/**
 * Rose Pine Theme - Light variant (Dawn)
 * Based on base16 Rosé Pine Dawn by Emilia Dunfelt
 */
const rosePineLight: ThemeColors = {
	// Backgrounds (base00, base01, base02)
	'bg-primary': '#faf4ed',
	'bg-secondary': '#fffaf3',
	'bg-tertiary': '#f2e9de',
	'bg-elevated': '#fffaf3',

	// Surfaces
	surface: '#fffaf3',
	'surface-hover': '#f2e9de',
	'surface-active': '#9893a5',

	// Borders
	border: '#9893a5',
	'border-light': '#797593',
	'border-focus': '#907aa9',

	// Text (base05, base04, base03)
	'text-primary': '#575279',
	'text-secondary': '#797593',
	'text-tertiary': '#9893a5',
	'text-muted': '#cecacd',

	// Brand (base0D, base0E)
	'brand-primary': '#907aa9',
	'brand-secondary': '#ea9d34',
	'brand-tertiary': '#56949f',

	// Accents (base08-base0F)
	'accent-blue': '#286983',
	'accent-green': '#56949f',
	'accent-red': '#b4637a',
	'accent-yellow': '#d7827e',
	'accent-purple': '#907aa9',
	'accent-cyan': '#56949f',

	// Status
	success: '#286983',
	warning: '#ea9d34',
	error: '#b4637a',
	info: '#907aa9'
};

/**
 * Theme registry
 */
export const themes: Record<ThemeName, Record<ThemeMode, ThemeColors>> = {
	'tokyo-night': {
		dark: tokyoNightDark,
		light: tokyoNightLight
	},
	kanagawa: {
		dark: kanagawaDark,
		light: kanagawaLight
	},
	'rose-pine': {
		dark: rosePineDark,
		light: rosePineLight
	}
};

/**
 * Default theme configuration
 */
export const defaultTheme: ThemeName = 'rose-pine';
export const defaultMode: ThemeMode = 'dark';

/**
 * Get theme colors for a given theme name and mode
 */
export function getThemeColors(themeName: ThemeName, mode: ThemeMode): ThemeColors {
	return themes[themeName][mode];
}

/**
 * Apply theme colors to CSS custom properties
 */
export function applyTheme(themeName: ThemeName, mode: ThemeMode): void {
	const colors = getThemeColors(themeName, mode);
	const root = document.documentElement;

	// Apply each color as a CSS custom property
	Object.entries(colors).forEach(([key, value]) => {
		root.style.setProperty(`--color-${key}`, value);
	});
}
