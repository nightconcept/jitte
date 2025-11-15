/**
 * Auto-versioning settings utility
 *
 * Provides functions to check and manage the auto-versioning setting,
 * which controls whether version prompts are shown when saving decks.
 */

import { browser } from "$app/environment";

const AUTO_VERSION_KEY = "jitte-auto-version-enabled";

/**
 * Check if auto-versioning is enabled
 * @returns true if auto-versioning is enabled, false otherwise
 */
export function isAutoVersionEnabled(): boolean {
  if (!browser) return false;
  return localStorage.getItem(AUTO_VERSION_KEY) === "true";
}

/**
 * Set the auto-versioning enabled state
 * @param enabled - Whether auto-versioning should be enabled
 */
export function setAutoVersionEnabled(enabled: boolean): void {
  if (!browser) return;
  localStorage.setItem(AUTO_VERSION_KEY, String(enabled));
}

/**
 * Toggle the auto-versioning setting
 * @returns The new state after toggling
 */
export function toggleAutoVersion(): boolean {
  const newState = !isAutoVersionEnabled();
  setAutoVersionEnabled(newState);
  return newState;
}
