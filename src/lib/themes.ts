/**
 * Theme configuration for Jitte
 * Now powered by Base16/Base24 color schemes
 * See theme/README.md for theme management
 */

export type ThemeName =
	| 'equilibrium-gray'
	| 'rose-pine'
	| 'kanagawa'
	| 'tokyo-night';

export type ThemeMode = 'light' | 'dark';

/**
 * Theme scheme IDs mapped to Base16 scheme names
 */
export const themeSchemes: Record<ThemeName, { dark: string; light: string }> = {
	'equilibrium-gray': {
		dark: 'equilibrium-gray-dark',
		light: 'equilibrium-gray-light'
	},
	'rose-pine': {
		dark: 'rose-pine-moon',
		light: 'rose-pine-dawn'
	},
	kanagawa: {
		dark: 'kanagawa',
		light: 'rose-pine-dawn' // Kanagawa doesn't have a good light variant
	},
	'tokyo-night': {
		dark: 'tokyo-night-dark-fixed',
		light: 'tokyo-night-light'
	}
};

/**
 * Theme display names
 */
export const themeNames: Record<ThemeName, string> = {
	'equilibrium-gray': 'Equilibrium Gray',
	'rose-pine': 'Rose Pine',
	kanagawa: 'Kanagawa',
	'tokyo-night': 'Tokyo Night'
};

/**
 * Default theme configuration
 */
export const defaultTheme: ThemeName = 'equilibrium-gray';
export const defaultMode: ThemeMode = 'dark';

/**
 * Apply theme by setting data attribute and toggling CSS class on document root
 */
export function applyTheme(themeName: ThemeName, mode: ThemeMode): void {
	const root = document.documentElement;

	// Set theme name as data attribute
	root.setAttribute('data-theme', themeName);

	// Toggle light mode class
	if (mode === 'light') {
		root.classList.add('theme-light');
		root.classList.remove('theme-dark');
	} else {
		root.classList.remove('theme-light');
		root.classList.add('theme-dark');
	}
}
