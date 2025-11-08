/**
 * Theme store for managing theme state and persistence
 */

import { writable } from 'svelte/store';
import { browser } from '$app/environment';
import {
	type ThemeName,
	type ThemeMode,
	defaultTheme,
	defaultMode,
	applyTheme
} from '$lib/themes';

export interface ThemeState {
	name: ThemeName;
	mode: ThemeMode;
}

const STORAGE_KEY = 'jitte-theme';

/**
 * Load theme from localStorage
 */
function loadTheme(): ThemeState {
	if (!browser) {
		return { name: defaultTheme, mode: defaultMode };
	}

	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (stored) {
			const parsed = JSON.parse(stored);
			// Validate the stored values
			if (isValidTheme(parsed)) {
				return parsed;
			}
		}
	} catch (e) {
		console.error('Failed to load theme from localStorage:', e);
	}

	return { name: defaultTheme, mode: defaultMode };
}

/**
 * Validate theme object
 */
function isValidTheme(obj: unknown): obj is ThemeState {
	if (typeof obj !== 'object' || obj === null) return false;
	const { name, mode } = obj as Record<string, unknown>;
	return (
		(name === 'tokyo-night' || name === 'kanagawa' || name === 'rose-pine') &&
		(mode === 'light' || mode === 'dark')
	);
}

/**
 * Save theme to localStorage
 */
function saveTheme(theme: ThemeState): void {
	if (!browser) return;

	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(theme));
	} catch (e) {
		console.error('Failed to save theme to localStorage:', e);
	}
}

/**
 * Create the theme store
 */
function createThemeStore() {
	const { subscribe, set, update } = writable<ThemeState>(loadTheme());

	// Apply initial theme
	if (browser) {
		const initial = loadTheme();
		applyTheme(initial.name, initial.mode);
	}

	return {
		subscribe,

		/**
		 * Set theme name
		 */
		setTheme: (name: ThemeName) => {
			update((state) => {
				const newState = { ...state, name };
				saveTheme(newState);
				applyTheme(newState.name, newState.mode);
				return newState;
			});
		},

		/**
		 * Set theme mode (light/dark)
		 */
		setMode: (mode: ThemeMode) => {
			update((state) => {
				const newState = { ...state, mode };
				saveTheme(newState);
				applyTheme(newState.name, newState.mode);
				return newState;
			});
		},

		/**
		 * Toggle between light and dark mode
		 */
		toggleMode: () => {
			update((state) => {
				const newMode: ThemeMode = state.mode === 'dark' ? 'light' : 'dark';
				const newState = { ...state, mode: newMode };
				saveTheme(newState);
				applyTheme(newState.name, newState.mode);
				return newState;
			});
		},

		/**
		 * Set both theme name and mode
		 */
		setThemeAndMode: (name: ThemeName, mode: ThemeMode) => {
			const newState = { name, mode };
			set(newState);
			saveTheme(newState);
			applyTheme(name, mode);
		},

		/**
		 * Reset to default theme
		 */
		reset: () => {
			const newState = { name: defaultTheme, mode: defaultMode };
			set(newState);
			saveTheme(newState);
			applyTheme(defaultTheme, defaultMode);
		}
	};
}

export const themeStore = createThemeStore();
