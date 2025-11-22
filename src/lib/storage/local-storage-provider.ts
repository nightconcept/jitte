/**
 * localStorage-based storage provider
 * Used as fallback when FileSystem API is not available
 */

import { getDeckFilename, extractDeckName } from '$lib/utils/filename';
import type { DeckArchive } from '$lib/utils/zip';
import type { DeckListEntry, IStorageProvider, StorageCapabilities, StorageResult } from './types';
import { StorageErrorCode, StorageProvider } from './types';

/**
 * Prefix for all localStorage keys
 */
const STORAGE_KEY_PREFIX = 'jitte_deck_';

/**
 * Key for storing deck metadata
 */
const DECK_METADATA_KEY = 'jitte_deck_metadata';

/**
 * Deck metadata stored in localStorage
 */
interface DeckMetadata {
	name: string;
	lastModified: number;
}

/**
 * localStorage implementation of IStorageProvider
 */
export class LocalStorageProvider implements IStorageProvider {
	readonly type = StorageProvider.LocalStorage;

	private initialized = false;

	getCapabilities(): StorageCapabilities {
		return {
			canStoreFiles: true,
			canCreateDirectories: false,
			canListFiles: true,
			requiresPermission: false,
			maxSize: 10 * 1024 * 1024 // ~10MB (varies by browser)
		};
	}

	async initialize(): Promise<StorageResult<void>> {
		try {
			// Test if localStorage is available and working
			const testKey = '__jitte_test__';
			localStorage.setItem(testKey, 'test');
			localStorage.removeItem(testKey);

			this.initialized = true;

			return {
				success: true
			};
		} catch (_error) {
			return {
				success: false,
				error: 'localStorage is not available or disabled',
				errorCode: StorageErrorCode.NotSupported
			};
		}
	}

	isInitialized(): boolean {
		return this.initialized;
	}

	/**
	 * Migrate a deck from old blob format to new folder format
	 */
	private async migrateOldDeck(deckName: string): Promise<StorageResult<DeckArchive>> {
		try {
			// Old format stored blobs as base64 under a single key
			const oldKey = `${STORAGE_KEY_PREFIX}${deckName}`;
			const oldData = localStorage.getItem(oldKey);

			if (!oldData) {
				// Not found in old format either
				return {
					success: false,
					error: `Deck "${deckName}" not found in old format`,
					errorCode: StorageErrorCode.NotFound
				};
			}

			console.log(`[LocalStorageProvider] Found old format deck "${deckName}", migrating...`);
			console.log(`[LocalStorageProvider] Old data length: ${oldData.length}, starts with:`, oldData.substring(0, 50));

			// Try to convert base64 to blob
			let base64Data = oldData;

			// Handle data URL format (data:application/zip;base64,...)
			if (oldData.includes(',')) {
				const parts = oldData.split(',');
				if (parts.length === 2) {
					base64Data = parts[1];
					console.log(`[LocalStorageProvider] Detected data URL format, extracted base64 part`);
				}
			}

			console.log(`[LocalStorageProvider] Attempting to decode base64 (length: ${base64Data.length})...`);

			let binaryString: string;
			try {
				binaryString = atob(base64Data);
				console.log(`[LocalStorageProvider] Successfully decoded base64, binary length: ${binaryString.length}`);
			} catch (decodeError) {
				console.error(`[LocalStorageProvider] Failed to decode base64:`, decodeError);
				throw new Error(`Invalid base64 data: ${decodeError instanceof Error ? decodeError.message : 'unknown error'}`);
			}

			const bytes = new Uint8Array(binaryString.length);
			for (let i = 0; i < binaryString.length; i++) {
				bytes[i] = binaryString.charCodeAt(i);
			}
			const blob = new Blob([bytes], { type: 'application/zip' });
			console.log(`[LocalStorageProvider] Created blob (${blob.size} bytes)`);

			// Decompress the archive
			console.log(`[LocalStorageProvider] Decompressing archive...`);
			const { decompressDeckArchive } = await import('$lib/utils/zip');
			const archive = await decompressDeckArchive(blob);
			console.log(`[LocalStorageProvider] Decompression successful, manifest:`, archive.manifest);

			// Save in new format (strip .zip extension from name)
			const cleanDeckName = extractDeckName(deckName);
			console.log(`[LocalStorageProvider] Saving in new format as "${cleanDeckName}"...`);
			const saveResult = await this.saveDeck(cleanDeckName, archive);
			if (!saveResult.success) {
				console.error(`[LocalStorageProvider] Save failed:`, saveResult.error);
				throw new Error(`Failed to save migrated deck: ${saveResult.error}`);
			}
			console.log(`[LocalStorageProvider] Save successful`);

			// Delete old format data
			localStorage.removeItem(oldKey);
			console.log(`[LocalStorageProvider] Migration complete for "${deckName}", old data removed`);

			return {
				success: true,
				data: archive
			};
		} catch (error) {
			console.error(`[LocalStorageProvider] Migration failed for "${deckName}":`, error);
			if (error instanceof Error) {
				console.error(`[LocalStorageProvider] Error stack:`, error.stack);
			}
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Migration failed',
				errorCode: StorageErrorCode.Unknown
			};
		}
	}

	async saveDeck(deckName: string, archive: DeckArchive): Promise<StorageResult<void>> {
		if (!this.initialized) {
			return {
				success: false,
				error: 'Storage not initialized',
				errorCode: StorageErrorCode.NotSupported
			};
		}

		try {
			const prefix = `${STORAGE_KEY_PREFIX}${deckName}/`;

			// Store manifest
			localStorage.setItem(`${prefix}manifest`, JSON.stringify(archive.manifest));

			// Store maybeboard metadata
			localStorage.setItem(
				`${prefix}maybeboards/metadata`,
				JSON.stringify({ defaultCategoryId: archive.maybeboard.defaultCategoryId })
			);

			// Store maybeboard categories
			for (const category of archive.maybeboard.categories) {
				localStorage.setItem(`${prefix}maybeboards/${category.id}`, JSON.stringify(category));
			}

			// Store version files
			for (const [branchName, versions] of Object.entries(archive.versions)) {
				for (const [versionFile, content] of Object.entries(versions)) {
					localStorage.setItem(`${prefix}branches/${branchName}/${versionFile}`, content);
				}
			}

			// Store stashes
			if (archive.stashes) {
				for (const [branchName, stashContent] of Object.entries(archive.stashes)) {
					localStorage.setItem(`${prefix}branches/${branchName}/stash.txt`, stashContent);
				}
			}

			// Update metadata
			await this.updateMetadata(deckName);

			return {
				success: true
			};
		} catch (error) {
			if (error instanceof DOMException && error.name === 'QuotaExceededError') {
				return {
					success: false,
					error: 'Storage quota exceeded',
					errorCode: StorageErrorCode.QuotaExceeded
				};
			}

			return {
				success: false,
				error: error instanceof Error ? error.message : 'Failed to save deck',
				errorCode: StorageErrorCode.Unknown
			};
		}
	}

	async loadDeck(deckName: string): Promise<StorageResult<DeckArchive>> {
		if (!this.initialized) {
			return {
				success: false,
				error: 'Storage not initialized',
				errorCode: StorageErrorCode.NotSupported
			};
		}

		try {
			const prefix = `${STORAGE_KEY_PREFIX}${deckName}/`;

			// Try to load manifest from new format
			let manifestJson = localStorage.getItem(`${prefix}manifest`);

			// If not found, try to migrate from old format (blob)
			if (!manifestJson) {
				console.log(`[LocalStorageProvider] Deck "${deckName}" not found in new format, checking for old format...`);
				const migrationResult = await this.migrateOldDeck(deckName);
				if (migrationResult.success && migrationResult.data) {
					console.log(`[LocalStorageProvider] Successfully migrated "${deckName}" to new format`);
					return migrationResult;
				}

				return {
					success: false,
					error: `Deck "${deckName}" not found`,
					errorCode: StorageErrorCode.NotFound
				};
			}
			const manifest = JSON.parse(manifestJson);

			// Load maybeboard metadata
			const maybeboardMetadataJson = localStorage.getItem(`${prefix}maybeboards/metadata`);
			if (!maybeboardMetadataJson) {
				return {
					success: false,
					error: `Deck "${deckName}" is missing maybeboard metadata`,
					errorCode: StorageErrorCode.InvalidData
				};
			}
			const maybeboardMetadata = JSON.parse(maybeboardMetadataJson);

			// Load maybeboard categories
			const categories = [];
			for (let i = 0; ; i++) {
				// Try to find categories by iterating through localStorage keys
				const keys = Object.keys(localStorage).filter((key) =>
					key.startsWith(`${prefix}maybeboards/`) && key !== `${prefix}maybeboards/metadata`
				);

				for (const key of keys) {
					const categoryJson = localStorage.getItem(key);
					if (categoryJson) {
						categories.push(JSON.parse(categoryJson));
					}
				}
				break;
			}

			const maybeboard = {
				categories,
				defaultCategoryId: maybeboardMetadata.defaultCategoryId
			};

			// Load versions
			const versions: Record<string, Record<string, string>> = {};
			const stashes: Record<string, string> = {};

			// Iterate through all localStorage keys to find branches
			const branchPrefix = `${prefix}branches/`;
			for (const key of Object.keys(localStorage)) {
				if (key.startsWith(branchPrefix)) {
					const relativePath = key.slice(branchPrefix.length);
					const pathParts = relativePath.split('/');

					if (pathParts.length === 2) {
						const [branchName, fileName] = pathParts;
						const content = localStorage.getItem(key);

						if (content) {
							if (fileName === 'stash.txt') {
								stashes[branchName] = content;
							} else {
								if (!versions[branchName]) {
									versions[branchName] = {};
								}
								versions[branchName][fileName] = content;
							}
						}
					}
				}
			}

			const archive: DeckArchive = {
				manifest,
				maybeboard,
				versions,
				stashes: Object.keys(stashes).length > 0 ? stashes : undefined
			};

			return {
				success: true,
				data: archive
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Failed to load deck',
				errorCode: StorageErrorCode.Unknown
			};
		}
	}

	async deleteDeck(deckName: string): Promise<StorageResult<void>> {
		if (!this.initialized) {
			return {
				success: false,
				error: 'Storage not initialized',
				errorCode: StorageErrorCode.NotSupported
			};
		}

		try {
			const prefix = `${STORAGE_KEY_PREFIX}${deckName}/`;

			// Remove all keys for this deck
			const keysToRemove = Object.keys(localStorage).filter((key) => key.startsWith(prefix));
			for (const key of keysToRemove) {
				localStorage.removeItem(key);
			}

			// Remove from metadata
			await this.removeFromMetadata(deckName);

			return {
				success: true
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Failed to delete deck',
				errorCode: StorageErrorCode.Unknown
			};
		}
	}

	async listDecks(): Promise<StorageResult<DeckListEntry[]>> {
		if (!this.initialized) {
			return {
				success: false,
				error: 'Storage not initialized',
				errorCode: StorageErrorCode.NotSupported
			};
		}

		try {
			const deckMap = new Map<string, DeckListEntry>();

			// Scan localStorage for actual deck folders (new format)
			// Format: jitte_deck_{name}/manifest
			const manifestSuffix = '/manifest';

			for (const key of Object.keys(localStorage)) {
				// Skip metadata key
				if (key === DECK_METADATA_KEY) {
					continue;
				}

				// Look for manifest keys to find actual decks
				if (key.startsWith(STORAGE_KEY_PREFIX) && key.endsWith(manifestSuffix)) {
					// Extract deck name: "jitte_deck_MyDeck/manifest" -> "MyDeck"
					const deckName = key.slice(STORAGE_KEY_PREFIX.length, -manifestSuffix.length);

					if (deckName) {
						try {
							// Read manifest to get last modified time
							const manifestJson = localStorage.getItem(key);
							if (manifestJson) {
								const manifest = JSON.parse(manifestJson);
								deckMap.set(deckName, {
									name: deckName,
									lastModified: new Date(manifest.updatedAt).getTime()
								});
							}
						} catch (error) {
							// Skip decks with invalid manifests
							console.warn(`[LocalStorageProvider] Skipping deck "${deckName}" - invalid manifest`);
						}
					}
				}
			}

			const decks = Array.from(deckMap.values());
			console.log(`[LocalStorageProvider] Listed ${decks.length} decks:`, decks.map(d => d.name));

			// Sort by last modified (newest first)
			decks.sort((a, b) => b.lastModified - a.lastModified);

			return {
				success: true,
				data: decks
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Failed to list decks',
				errorCode: StorageErrorCode.Unknown
			};
		}
	}

	async deckExists(deckName: string): Promise<StorageResult<boolean>> {
		if (!this.initialized) {
			return {
				success: false,
				error: 'Storage not initialized',
				errorCode: StorageErrorCode.NotSupported
			};
		}

		const key = `${STORAGE_KEY_PREFIX}${deckName}/manifest`;
		const exists = localStorage.getItem(key) !== null;

		return {
			success: true,
			data: exists
		};
	}

	async getAvailableSpace(): Promise<StorageResult<number>> {
		// localStorage doesn't provide a standard way to query available space
		// Return an estimate
		return {
			success: true,
			data: 5 * 1024 * 1024 // Estimate 5MB remaining
		};
	}

	/**
	 * Get deck metadata from localStorage
	 */
	private getMetadata(): DeckMetadata[] {
		const metadataJson = localStorage.getItem(DECK_METADATA_KEY);
		if (!metadataJson) {
			return [];
		}

		try {
			return JSON.parse(metadataJson);
		} catch {
			return [];
		}
	}

	/**
	 * Update metadata for a deck
	 */
	private async updateMetadata(name: string): Promise<void> {
		const metadata = this.getMetadata();
		const existingIndex = metadata.findIndex((m) => m.name === name);

		const entry: DeckMetadata = {
			name,
			lastModified: Date.now()
		};

		if (existingIndex >= 0) {
			metadata[existingIndex] = entry;
		} else {
			metadata.push(entry);
		}

		localStorage.setItem(DECK_METADATA_KEY, JSON.stringify(metadata));
	}

	/**
	 * Remove deck from metadata
	 */
	private async removeFromMetadata(name: string): Promise<void> {
		const metadata = this.getMetadata();
		const filtered = metadata.filter((m) => m.name !== name);
		localStorage.setItem(DECK_METADATA_KEY, JSON.stringify(filtered));
	}

	async renameDeck(oldName: string, newName: string): Promise<StorageResult<void>> {
		if (!this.initialized) {
			return {
				success: false,
				error: 'Storage not initialized',
				errorCode: StorageErrorCode.NotSupported
			};
		}

		try {
			// Strip .zip extension from both names for comparison
			const cleanOldName = extractDeckName(oldName);
			const cleanNewName = extractDeckName(newName);

			// If they're the same after cleaning, nothing to do
			if (cleanOldName === cleanNewName) {
				console.log(`[LocalStorageProvider] Rename skipped: "${oldName}" and "${newName}" are the same after normalization`);
				// Just delete the old .zip version if it exists
				const oldPrefix = `${STORAGE_KEY_PREFIX}${oldName}/`;
				const keysToRemove = Object.keys(localStorage).filter((key) => key.startsWith(oldPrefix));
				for (const key of keysToRemove) {
					localStorage.removeItem(key);
				}
				return {
					success: true
				};
			}

			const oldPrefix = `${STORAGE_KEY_PREFIX}${cleanOldName}/`;
			const newPrefix = `${STORAGE_KEY_PREFIX}${cleanNewName}/`;

			// Load the deck (may trigger migration which creates cleanOldName)
			const loadResult = await this.loadDeck(oldName);
			if (!loadResult.success || !loadResult.data) {
				return {
					success: false,
					error: `Deck "${oldName}" not found`,
					errorCode: StorageErrorCode.NotFound
				};
			}

			// Check if new name already exists (after migration)
			if (localStorage.getItem(`${newPrefix}manifest`) !== null) {
				return {
					success: false,
					error: `A deck with the name "${cleanNewName}" already exists`,
					errorCode: StorageErrorCode.AlreadyExists
				};
			}

			// Update manifest name
			const archive = loadResult.data;
			archive.manifest.name = cleanNewName;
			archive.manifest.updatedAt = new Date().toISOString();

			// Save with new name
			const saveResult = await this.saveDeck(cleanNewName, archive);
			if (!saveResult.success) {
				return saveResult;
			}

			// Delete old deck - need to delete both the cleaned name and original name
			// in case the deck was stored with .zip in the key prefix
			await this.deleteDeck(cleanOldName);
			if (oldName !== cleanOldName) {
				// Also delete using original name in case keys have .zip in prefix
				await this.deleteDeck(oldName);
			}

			return {
				success: true
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Failed to rename deck',
				errorCode: StorageErrorCode.Unknown
			};
		}
	}
}
