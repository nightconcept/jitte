/**
 * Dual Storage Manager
 *
 * Orchestrates storage between FileSystem API (primary) and IndexedDB (backup).
 * Provides redundancy and folder sync capabilities.
 *
 * Strategy:
 * - Primary: FileSystem API (user-selected folder in Documents)
 * - Backup: IndexedDB (always available)
 * - Writes go to both (dual-write for redundancy)
 * - Reads prefer FileSystem, fallback to IndexedDB
 * - Folder handle persisted in IndexedDB for session restoration
 */

import type { DeckArchive } from '$lib/utils/zip';
import type { DeckListEntry, IStorageProvider, StorageCapabilities, StorageResult, StorageConfig } from './types';
import { StorageErrorCode, StorageProvider } from './types';
import { FileSystemFolderProvider, isFolderStorageSupported } from './filesystem-folder-provider';
import { IndexedDBDeckProvider, indexedDBDeckProvider } from './indexeddb-deck-provider';
import { deckDatabase } from './deck-database';

/**
 * Dual storage configuration
 */
export interface DualStorageConfig {
	/** Whether folder sync is enabled */
	folderSyncEnabled: boolean;

	/** Path to synced folder (for display) */
	folderPath?: string;

	/** Whether IndexedDB is available */
	indexedDBAvailable: boolean;

	/** Whether FileSystem API is available */
	fileSystemAvailable: boolean;
}

/**
 * Dual Storage Manager
 * Coordinates between FileSystem API and IndexedDB storage
 */
export class DualStorageManager {
	private folderProvider: FileSystemFolderProvider | null = null;
	private indexedDBProvider: IndexedDBDeckProvider;
	private initialized = false;
	private folderSyncEnabled = false;

	constructor() {
		this.indexedDBProvider = indexedDBDeckProvider;
	}

	/**
	 * Initialize the dual storage system
	 * Attempts to restore folder handle from previous session
	 */
	async initialize(): Promise<StorageResult<DualStorageConfig>> {
		try {
			// Initialize IndexedDB (always required)
			const indexedDBResult = await this.indexedDBProvider.initialize();
			if (!indexedDBResult.success) {
				return {
					success: false,
					error: 'IndexedDB initialization failed: ' + indexedDBResult.error,
					errorCode: StorageErrorCode.NotSupported
				};
			}

			// Try to restore folder handle from previous session
			let folderPath: string | undefined;
			if (isFolderStorageSupported()) {
				const storedHandle = await deckDatabase.getDefaultFolderHandle();

				if (storedHandle) {
					// Try to restore with existing handle
					this.folderProvider = new FileSystemFolderProvider();
					const restoreResult = await this.folderProvider.initializeWithHandle(storedHandle.handle);

					if (restoreResult.success) {
						this.folderSyncEnabled = true;
						folderPath = storedHandle.path;
						console.log('[DualStorage] Restored folder sync:', folderPath);
					} else {
						// Handle is stale, clear it
						console.log('[DualStorage] Could not restore folder handle, clearing');
						await deckDatabase.deleteFolderHandle('default');
						this.folderProvider = null;
					}
				}
			}

			this.initialized = true;

			return {
				success: true,
				data: {
					folderSyncEnabled: this.folderSyncEnabled,
					folderPath,
					indexedDBAvailable: true,
					fileSystemAvailable: isFolderStorageSupported()
				}
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Initialization failed',
				errorCode: StorageErrorCode.Unknown
			};
		}
	}

	/**
	 * Enable folder sync by selecting a folder
	 * Shows the folder picker dialog
	 */
	async enableFolderSync(): Promise<StorageResult<string>> {
		if (!isFolderStorageSupported()) {
			return {
				success: false,
				error: 'FileSystem API not supported in this browser',
				errorCode: StorageErrorCode.NotSupported
			};
		}

		try {
			this.folderProvider = new FileSystemFolderProvider();
			const initResult = await this.folderProvider.initialize();

			if (!initResult.success) {
				this.folderProvider = null;
				return {
					success: false,
					error: initResult.error || 'Failed to select folder',
					errorCode: initResult.errorCode
				};
			}

			// Get the handle and path
			const handle = this.folderProvider.getDirectoryHandle();
			const path = this.folderProvider.getDirectoryPath();

			if (!handle || !path) {
				this.folderProvider = null;
				return {
					success: false,
					error: 'No folder selected',
					errorCode: StorageErrorCode.PermissionDenied
				};
			}

			// Persist the handle for future sessions
			await deckDatabase.saveDefaultFolderHandle(handle, path);

			this.folderSyncEnabled = true;
			console.log('[DualStorage] Folder sync enabled:', path);

			return {
				success: true,
				data: path
			};
		} catch (error) {
			this.folderProvider = null;
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Failed to enable folder sync',
				errorCode: StorageErrorCode.Unknown
			};
		}
	}

	/**
	 * Disable folder sync
	 */
	async disableFolderSync(): Promise<StorageResult<void>> {
		this.folderProvider = null;
		this.folderSyncEnabled = false;
		await deckDatabase.deleteFolderHandle('default');

		console.log('[DualStorage] Folder sync disabled');

		return { success: true };
	}

	/**
	 * Check if folder sync is enabled and working
	 */
	isFolderSyncEnabled(): boolean {
		return this.folderSyncEnabled && this.folderProvider !== null;
	}

	/**
	 * Get current storage configuration
	 */
	getConfig(): DualStorageConfig {
		return {
			folderSyncEnabled: this.folderSyncEnabled,
			folderPath: this.folderProvider?.getDirectoryPath() || undefined,
			indexedDBAvailable: this.indexedDBProvider.isInitialized(),
			fileSystemAvailable: isFolderStorageSupported()
		};
	}

	/**
	 * Save a deck to both storages (dual-write)
	 */
	async saveDeck(deckName: string, archive: DeckArchive): Promise<StorageResult<void>> {
		if (!this.initialized) {
			return {
				success: false,
				error: 'Storage not initialized',
				errorCode: StorageErrorCode.NotSupported
			};
		}

		const errors: string[] = [];

		// Always save to IndexedDB (primary/backup)
		const indexedDBResult = await this.indexedDBProvider.saveDeck(deckName, archive);
		if (!indexedDBResult.success) {
			errors.push(`IndexedDB: ${indexedDBResult.error}`);
		}

		// Save to folder if enabled
		if (this.folderSyncEnabled && this.folderProvider) {
			const folderResult = await this.folderProvider.saveDeck(deckName, archive);
			if (!folderResult.success) {
				errors.push(`Folder: ${folderResult.error}`);
				// Don't fail the whole operation if folder write fails
				console.warn('[DualStorage] Folder write failed:', folderResult.error);
			}
		}

		// Consider success if at least one storage succeeded
		if (indexedDBResult.success) {
			return { success: true };
		}

		return {
			success: false,
			error: errors.join('; '),
			errorCode: StorageErrorCode.Unknown
		};
	}

	/**
	 * Load a deck, preferring folder if synced
	 */
	async loadDeck(deckName: string): Promise<StorageResult<DeckArchive>> {
		if (!this.initialized) {
			return {
				success: false,
				error: 'Storage not initialized',
				errorCode: StorageErrorCode.NotSupported
			};
		}

		// Try folder first if enabled (might have newer data)
		if (this.folderSyncEnabled && this.folderProvider) {
			const folderResult = await this.folderProvider.loadDeck(deckName);
			if (folderResult.success) {
				return folderResult;
			}
			// Fall through to IndexedDB if folder fails
			console.warn('[DualStorage] Folder load failed, trying IndexedDB:', folderResult.error);
		}

		// Load from IndexedDB
		return this.indexedDBProvider.loadDeck(deckName);
	}

	/**
	 * Delete a deck from both storages
	 */
	async deleteDeck(deckName: string): Promise<StorageResult<void>> {
		if (!this.initialized) {
			return {
				success: false,
				error: 'Storage not initialized',
				errorCode: StorageErrorCode.NotSupported
			};
		}

		const errors: string[] = [];

		// Delete from IndexedDB
		const indexedDBResult = await this.indexedDBProvider.deleteDeck(deckName);
		if (!indexedDBResult.success) {
			errors.push(`IndexedDB: ${indexedDBResult.error}`);
		}

		// Delete from folder if enabled
		if (this.folderSyncEnabled && this.folderProvider) {
			const folderResult = await this.folderProvider.deleteDeck(deckName);
			if (!folderResult.success && folderResult.errorCode !== StorageErrorCode.NotFound) {
				errors.push(`Folder: ${folderResult.error}`);
			}
		}

		if (indexedDBResult.success) {
			return { success: true };
		}

		return {
			success: false,
			error: errors.join('; '),
			errorCode: StorageErrorCode.Unknown
		};
	}

	/**
	 * Rename a deck in both storages
	 */
	async renameDeck(oldName: string, newName: string): Promise<StorageResult<void>> {
		if (!this.initialized) {
			return {
				success: false,
				error: 'Storage not initialized',
				errorCode: StorageErrorCode.NotSupported
			};
		}

		// Rename in IndexedDB first
		const indexedDBResult = await this.indexedDBProvider.renameDeck(oldName, newName);
		if (!indexedDBResult.success) {
			return indexedDBResult;
		}

		// Rename in folder if enabled
		if (this.folderSyncEnabled && this.folderProvider) {
			const folderResult = await this.folderProvider.renameDeck(oldName, newName);
			if (!folderResult.success) {
				console.warn('[DualStorage] Folder rename failed:', folderResult.error);
				// Don't fail - IndexedDB succeeded
			}
		}

		return { success: true };
	}

	/**
	 * List all decks (merged from both storages)
	 */
	async listDecks(): Promise<StorageResult<DeckListEntry[]>> {
		if (!this.initialized) {
			return {
				success: false,
				error: 'Storage not initialized',
				errorCode: StorageErrorCode.NotSupported
			};
		}

		// Get decks from IndexedDB (authoritative)
		const indexedDBResult = await this.indexedDBProvider.listDecks();
		if (!indexedDBResult.success) {
			return indexedDBResult;
		}

		const deckMap = new Map<string, DeckListEntry>();

		// Add IndexedDB decks
		for (const deck of indexedDBResult.data || []) {
			deckMap.set(deck.name, deck);
		}

		// Merge folder decks if enabled (use most recent)
		if (this.folderSyncEnabled && this.folderProvider) {
			const folderResult = await this.folderProvider.listDecks();
			if (folderResult.success && folderResult.data) {
				for (const deck of folderResult.data) {
					const existing = deckMap.get(deck.name);
					if (!existing || deck.lastModified > existing.lastModified) {
						deckMap.set(deck.name, deck);
					}
				}
			}
		}

		const decks = Array.from(deckMap.values());
		decks.sort((a, b) => b.lastModified - a.lastModified);

		return {
			success: true,
			data: decks
		};
	}

	/**
	 * Check if a deck exists in either storage
	 */
	async deckExists(deckName: string): Promise<StorageResult<boolean>> {
		if (!this.initialized) {
			return {
				success: false,
				error: 'Storage not initialized',
				errorCode: StorageErrorCode.NotSupported
			};
		}

		// Check IndexedDB
		const indexedDBResult = await this.indexedDBProvider.deckExists(deckName);
		if (indexedDBResult.success && indexedDBResult.data) {
			return indexedDBResult;
		}

		// Check folder if enabled
		if (this.folderSyncEnabled && this.folderProvider) {
			const folderResult = await this.folderProvider.deckExists(deckName);
			if (folderResult.success && folderResult.data) {
				return folderResult;
			}
		}

		return {
			success: true,
			data: false
		};
	}

	/**
	 * Get available storage space (from IndexedDB)
	 */
	async getAvailableSpace(): Promise<StorageResult<number>> {
		return this.indexedDBProvider.getAvailableSpace();
	}

	/**
	 * Sync a specific deck from folder to IndexedDB
	 */
	async syncFromFolder(deckName: string): Promise<StorageResult<void>> {
		if (!this.folderSyncEnabled || !this.folderProvider) {
			return {
				success: false,
				error: 'Folder sync not enabled',
				errorCode: StorageErrorCode.NotSupported
			};
		}

		// Load from folder
		const folderResult = await this.folderProvider.loadDeck(deckName);
		if (!folderResult.success || !folderResult.data) {
			return {
				success: false,
				error: folderResult.error || 'Failed to load from folder',
				errorCode: folderResult.errorCode
			};
		}

		// Save to IndexedDB
		return this.indexedDBProvider.saveDeck(deckName, folderResult.data);
	}

	/**
	 * Sync a specific deck from IndexedDB to folder
	 */
	async syncToFolder(deckName: string): Promise<StorageResult<void>> {
		if (!this.folderSyncEnabled || !this.folderProvider) {
			return {
				success: false,
				error: 'Folder sync not enabled',
				errorCode: StorageErrorCode.NotSupported
			};
		}

		// Load from IndexedDB
		const indexedDBResult = await this.indexedDBProvider.loadDeck(deckName);
		if (!indexedDBResult.success || !indexedDBResult.data) {
			return {
				success: false,
				error: indexedDBResult.error || 'Failed to load from IndexedDB',
				errorCode: indexedDBResult.errorCode
			};
		}

		// Save to folder
		return this.folderProvider.saveDeck(deckName, indexedDBResult.data);
	}

	/**
	 * Sync all decks between storages
	 */
	async syncAll(): Promise<StorageResult<{ synced: number; errors: string[] }>> {
		if (!this.folderSyncEnabled || !this.folderProvider) {
			return {
				success: false,
				error: 'Folder sync not enabled',
				errorCode: StorageErrorCode.NotSupported
			};
		}

		const errors: string[] = [];
		let synced = 0;

		// Get all decks from both storages
		const indexedDBDecks = await this.indexedDBProvider.listDecks();
		const folderDecks = await this.folderProvider.listDecks();

		const allDeckNames = new Set<string>();

		if (indexedDBDecks.success && indexedDBDecks.data) {
			for (const deck of indexedDBDecks.data) {
				allDeckNames.add(deck.name);
			}
		}

		if (folderDecks.success && folderDecks.data) {
			for (const deck of folderDecks.data) {
				allDeckNames.add(deck.name);
			}
		}

		// Sync each deck
		for (const deckName of allDeckNames) {
			try {
				// Load from both, keep newer
				const indexedDBResult = await this.indexedDBProvider.loadDeck(deckName);
				const folderResult = await this.folderProvider.loadDeck(deckName);

				let sourceArchive: DeckArchive | null = null;
				let source = '';

				if (indexedDBResult.success && folderResult.success) {
					// Both exist - use newer
					const indexedDBTime = new Date(indexedDBResult.data!.manifest.updatedAt).getTime();
					const folderTime = new Date(folderResult.data!.manifest.updatedAt).getTime();

					if (indexedDBTime >= folderTime) {
						sourceArchive = indexedDBResult.data!;
						source = 'IndexedDB';
					} else {
						sourceArchive = folderResult.data!;
						source = 'folder';
					}
				} else if (indexedDBResult.success) {
					sourceArchive = indexedDBResult.data!;
					source = 'IndexedDB';
				} else if (folderResult.success) {
					sourceArchive = folderResult.data!;
					source = 'folder';
				}

				if (sourceArchive) {
					// Save to both
					await this.saveDeck(deckName, sourceArchive);
					synced++;
					console.log(`[DualStorage] Synced ${deckName} from ${source}`);
				}
			} catch (error) {
				errors.push(`${deckName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
			}
		}

		return {
			success: true,
			data: { synced, errors }
		};
	}
}

// Export singleton
let dualStorageInstance: DualStorageManager | null = null;

export function getDualStorageManager(): DualStorageManager {
	if (!dualStorageInstance) {
		dualStorageInstance = new DualStorageManager();
	}
	return dualStorageInstance;
}
