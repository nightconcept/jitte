/**
 * View settings store for managing view mode preference and persistence
 */

import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export type ViewMode = 'text' | 'condensed' | 'visual' | 'stacks';

export interface ViewSettings {
	viewMode: ViewMode;
}

const STORAGE_KEY = 'jitte-view-settings';
const DEFAULT_VIEW_MODE: ViewMode = 'text';

/**
 * Load view settings from localStorage
 */
function loadViewSettings(): ViewSettings {
	if (!browser) {
		return { viewMode: DEFAULT_VIEW_MODE };
	}

	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (stored) {
			const parsed = JSON.parse(stored);
			// Validate the stored values
			if (isValidViewSettings(parsed)) {
				return parsed;
			}
		}
	} catch (e) {
		console.error('Failed to load view settings from localStorage:', e);
	}

	return { viewMode: DEFAULT_VIEW_MODE };
}

/**
 * Validate view settings object
 */
function isValidViewSettings(obj: unknown): obj is ViewSettings {
	if (typeof obj !== 'object' || obj === null) return false;
	const { viewMode } = obj as Record<string, unknown>;
	return viewMode === 'text' || viewMode === 'condensed' || viewMode === 'visual' || viewMode === 'stacks';
}

/**
 * Save view settings to localStorage
 */
function saveViewSettings(settings: ViewSettings): void {
	if (!browser) return;

	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
	} catch (e) {
		console.error('Failed to save view settings to localStorage:', e);
	}
}

/**
 * Create the view settings store
 */
function createViewSettingsStore() {
	const { subscribe, set, update } = writable<ViewSettings>(loadViewSettings());

	return {
		subscribe,

		/**
		 * Set view mode
		 */
		setViewMode: (viewMode: ViewMode) => {
			update((state) => {
				const newState = { ...state, viewMode };
				saveViewSettings(newState);
				return newState;
			});
		},

		/**
		 * Reset to default view settings
		 */
		reset: () => {
			const newState = { viewMode: DEFAULT_VIEW_MODE };
			set(newState);
			saveViewSettings(newState);
		}
	};
}

export const viewSettingsStore = createViewSettingsStore();
