/**
 * localStorage-based storage provider
 * Used as fallback when FileSystem API is not available
 */

import { getDeckFilename } from '$lib/utils/filename';
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
	filename: string;
	lastModified: number;
	size: number;
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

	async saveDeck(deckName: string, zipBlob: Blob): Promise<StorageResult<void>> {
		if (!this.initialized) {
			return {
				success: false,
				error: 'Storage not initialized',
				errorCode: StorageErrorCode.NotSupported
			};
		}

		try {
			const filename = getDeckFilename(deckName);
			const key = STORAGE_KEY_PREFIX + filename;

			// Convert blob to base64 for localStorage
			const base64 = await blobToBase64(zipBlob);

			// Store the deck data
			localStorage.setItem(key, base64);

			// Update metadata
			await this.updateMetadata(deckName, filename, zipBlob.size);

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

	async loadDeck(deckName: string): Promise<StorageResult<Blob>> {
		if (!this.initialized) {
			return {
				success: false,
				error: 'Storage not initialized',
				errorCode: StorageErrorCode.NotSupported
			};
		}

		try {
			const filename = getDeckFilename(deckName);
			const key = STORAGE_KEY_PREFIX + filename;

			const base64 = localStorage.getItem(key);

			if (!base64) {
				return {
					success: false,
					error: `Deck "${deckName}" not found`,
					errorCode: StorageErrorCode.NotFound
				};
			}

			// Convert base64 back to blob
			const blob = base64ToBlob(base64);

			return {
				success: true,
				data: blob
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
			const filename = getDeckFilename(deckName);
			const key = STORAGE_KEY_PREFIX + filename;

			// Remove the deck data
			localStorage.removeItem(key);

			// Remove from metadata
			await this.removeFromMetadata(filename);

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
			const metadata = this.getMetadata();
			const decks: DeckListEntry[] = metadata.map((meta) => ({
				name: meta.name,
				filename: meta.filename,
				lastModified: meta.lastModified,
				size: meta.size
			}));

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

		const filename = getDeckFilename(deckName);
		const key = STORAGE_KEY_PREFIX + filename;
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
	private async updateMetadata(name: string, filename: string, size: number): Promise<void> {
		const metadata = this.getMetadata();
		const existingIndex = metadata.findIndex((m) => m.filename === filename);

		const entry: DeckMetadata = {
			name,
			filename,
			lastModified: Date.now(),
			size
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
	private async removeFromMetadata(filename: string): Promise<void> {
		const metadata = this.getMetadata();
		const filtered = metadata.filter((m) => m.filename !== filename);
		localStorage.setItem(DECK_METADATA_KEY, JSON.stringify(filtered));
	}
}

/**
 * Convert Blob to base64 string
 */
function blobToBase64(blob: Blob): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onloadend = () => {
			const result = reader.result as string;
			// Remove data URL prefix (e.g., "data:application/zip;base64,")
			const base64 = result.split(',')[1];
			resolve(base64);
		};
		reader.onerror = reject;
		reader.readAsDataURL(blob);
	});
}

/**
 * Convert base64 string to Blob
 */
function base64ToBlob(base64: string): Blob {
	const binaryString = atob(base64);
	const bytes = new Uint8Array(binaryString.length);

	for (let i = 0; i < binaryString.length; i++) {
		bytes[i] = binaryString.charCodeAt(i);
	}

	return new Blob([bytes], { type: 'application/zip' });
}
