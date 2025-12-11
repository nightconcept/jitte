/**
 * LocalStorage Cleanup Migration
 *
 * Removes old deck data from localStorage after v1-to-v2 migration completes.
 * This frees up localStorage quota and prevents confusion with dual storage.
 *
 * Prerequisites:
 * - v1-to-v2 migration must be complete
 *
 * What it does:
 * 1. Verifies decks exist in new IndexedDB format
 * 2. Removes old localStorage keys (jitte-deck-list, jitte-deck-*)
 * 3. Keeps non-deck localStorage data (settings, preferences)
 */

import type { Migration, MigrationProgressCallback, MigrationResult } from './types';
import { deckDatabase } from '../deck-database';
import { getCompletedMigrations } from './index';

// Storage keys for old localStorage format
const DECK_LIST_KEY = 'jitte-deck-list';
const DECK_PREFIX = 'jitte-deck-';

/**
 * Get all localStorage keys that belong to decks
 */
function getDeckStorageKeys(): string[] {
	if (typeof localStorage === 'undefined') return [];

	const keys: string[] = [];

	// Check for deck list
	if (localStorage.getItem(DECK_LIST_KEY)) {
		keys.push(DECK_LIST_KEY);
	}

	// Find all deck keys
	for (let i = 0; i < localStorage.length; i++) {
		const key = localStorage.key(i);
		if (key && key.startsWith(DECK_PREFIX)) {
			keys.push(key);
		}
	}

	return keys;
}

/**
 * Get deck names from localStorage
 */
function getLocalStorageDeckNames(): string[] {
	if (typeof localStorage === 'undefined') return [];

	const deckListJson = localStorage.getItem(DECK_LIST_KEY);
	if (!deckListJson) return [];

	try {
		const deckList = JSON.parse(deckListJson);
		return Array.isArray(deckList) ? deckList : [];
	} catch {
		return [];
	}
}

/**
 * LocalStorage Cleanup Migration
 */
export class LocalStorageCleanupMigration implements Migration {
	id = 'localstorage-cleanup';
	description = 'Remove old deck data from localStorage after migration';
	fromVersion = '2.0' as const;
	toVersion = '2.0' as const;

	private removedKeys: string[] = [];

	async canMigrate(): Promise<boolean> {
		// Check if v1-to-v2 migration is complete
		// Note: We use getCompletedMigrations() directly to avoid recursion,
		// since getMigrationStatus() calls canMigrate() on all migrations
		const completed = await getCompletedMigrations();
		const completedIds = completed.map((m) => m.id);
		if (!completedIds.includes('v1-to-v2')) {
			// v1-to-v2 not complete, don't run cleanup yet
			return false;
		}

		// Check if there's any localStorage data to clean up
		const keys = getDeckStorageKeys();
		return keys.length > 0;
	}

	async migrate(onProgress?: MigrationProgressCallback): Promise<MigrationResult> {
		const startTime = Date.now();
		this.removedKeys = [];
		const warnings: string[] = [];

		try {
			// Get all deck names from localStorage
			const deckNames = getLocalStorageDeckNames();
			const keys = getDeckStorageKeys();

			if (keys.length === 0) {
				return {
					success: true,
					itemsMigrated: 0,
					durationMs: Date.now() - startTime
				};
			}

			onProgress?.({
				step: 'Verifying decks in new storage',
				percentage: 0,
				totalItems: deckNames.length,
				processedItems: 0
			});

			// Verify all decks exist in IndexedDB before removing from localStorage
			for (let i = 0; i < deckNames.length; i++) {
				const deckName = deckNames[i];

				onProgress?.({
					step: 'Verifying decks in new storage',
					percentage: Math.round((i / deckNames.length) * 50),
					currentItem: deckName,
					totalItems: deckNames.length,
					processedItems: i
				});

				const deck = await deckDatabase.getDeck(deckName);
				if (!deck) {
					warnings.push(`Deck "${deckName}" not found in new storage, keeping localStorage copy`);
					// Remove from keys to delete
					const keyToKeep = `${DECK_PREFIX}${deckName}`;
					const idx = keys.indexOf(keyToKeep);
					if (idx > -1) {
						keys.splice(idx, 1);
					}
				}
			}

			onProgress?.({
				step: 'Removing old localStorage data',
				percentage: 50,
				totalItems: keys.length,
				processedItems: 0
			});

			// Remove verified keys
			for (let i = 0; i < keys.length; i++) {
				const key = keys[i];

				onProgress?.({
					step: 'Removing old localStorage data',
					percentage: 50 + Math.round((i / keys.length) * 50),
					currentItem: key,
					totalItems: keys.length,
					processedItems: i
				});

				try {
					localStorage.removeItem(key);
					this.removedKeys.push(key);
					console.log(`[LocalStorageCleanup] Removed key: ${key}`);
				} catch (error) {
					warnings.push(`Failed to remove key "${key}": ${error}`);
				}
			}

			onProgress?.({
				step: 'Cleanup complete',
				percentage: 100,
				totalItems: keys.length,
				processedItems: keys.length
			});

			return {
				success: true,
				itemsMigrated: this.removedKeys.length,
				warnings: warnings.length > 0 ? warnings : undefined,
				durationMs: Date.now() - startTime
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Cleanup failed',
				durationMs: Date.now() - startTime
			};
		}
	}

	async validate(): Promise<boolean> {
		// Verify removed keys are actually gone
		for (const key of this.removedKeys) {
			if (localStorage.getItem(key) !== null) {
				console.error(`[LocalStorageCleanup] Key "${key}" still exists`);
				return false;
			}
		}
		return true;
	}
}

// Export singleton
export const localStorageCleanupMigration = new LocalStorageCleanupMigration();
