/**
 * Deck Database (IndexedDB)
 *
 * Separate IndexedDB database for deck storage, independent from card cache.
 * This separation ensures:
 * - Card cache can be cleared without losing decks
 * - Independent schema versioning
 * - Corruption isolation
 *
 * Object stores:
 * - decks: Deck manifests and metadata
 * - deck-versions: Base snapshots and deltas
 * - deck-maybeboards: Maybeboard data
 * - deck-stashes: Stash data
 * - folder-handles: Persisted FileSystemDirectoryHandle references
 */

import type { DeckFormat } from '$lib/formats/format-registry';
import type { CardReferencesByCategory, MaybeboardReference, StashReference } from '$lib/types/card-reference';
import type { VersionContent, VersionMeta } from '$lib/types/version-delta';
import type { DeckManifest } from '$lib/types/deck';

const DB_NAME = 'jitte-deck-storage';
const DB_VERSION = 1;

// Object store names
const STORES = {
	DECKS: 'decks',
	VERSIONS: 'deck-versions',
	MAYBEBOARDS: 'deck-maybeboards',
	STASHES: 'deck-stashes',
	FOLDER_HANDLES: 'folder-handles'
} as const;

/**
 * Stored deck record
 */
export interface StoredDeck {
	/** Deck name - primary key */
	name: string;

	/** Full manifest */
	manifest: DeckManifest;

	/** Format for quick filtering */
	format: DeckFormat;

	/** Path to synced folder (if any) */
	folderPath?: string;

	/** Last sync timestamp */
	lastSynced?: number;

	/** Creation timestamp */
	createdAt: number;

	/** Last update timestamp */
	updatedAt: number;

	/** Storage schema version for migrations */
	storageSchemaVersion: string;

	/** Track base versions per branch */
	branchBases: Record<string, string[]>;
}

/**
 * Stored version record (base or delta)
 */
export interface StoredVersion {
	/** Composite key: "{deckName}/{branch}/{version}" */
	id: string;

	/** Deck name for indexing */
	deckName: string;

	/** Branch name */
	branch: string;

	/** Semantic version */
	version: string;

	/** Whether this is a base snapshot */
	isBase: boolean;

	/** Version content (base snapshot or delta) */
	content: VersionContent;

	/** Version metadata */
	meta: VersionMeta;
}

/**
 * Stored maybeboard record
 */
export interface StoredMaybeboard {
	/** Deck name - primary key */
	deckName: string;

	/** Maybeboard data */
	maybeboard: MaybeboardReference;

	/** Last update timestamp */
	updatedAt: number;
}

/**
 * Stored stash record
 */
export interface StoredStash {
	/** Composite key: "{deckName}/{branch}" */
	id: string;

	/** Deck name for indexing */
	deckName: string;

	/** Branch name */
	branch: string;

	/** Stash data */
	stash: StashReference;
}

/**
 * Stored folder handle record
 */
export interface StoredFolderHandle {
	/** Handle identifier - "default" for main storage folder */
	id: string;

	/** The FileSystemDirectoryHandle */
	handle: FileSystemDirectoryHandle;

	/** Display path/name */
	path: string;

	/** Last successful access timestamp */
	lastUsed: number;
}

/**
 * Deck Database class
 * Manages IndexedDB operations for deck storage
 */
export class DeckDatabase {
	private dbPromise: Promise<IDBDatabase> | null = null;

	/**
	 * Initialize and get the database connection
	 */
	private async getDb(): Promise<IDBDatabase> {
		if (this.dbPromise) {
			return this.dbPromise;
		}

		this.dbPromise = new Promise((resolve, reject) => {
			const request = indexedDB.open(DB_NAME, DB_VERSION);

			request.onerror = () => reject(request.error);
			request.onsuccess = () => resolve(request.result);

			request.onupgradeneeded = (event) => {
				const db = (event.target as IDBOpenDBRequest).result;

				// Decks store
				if (!db.objectStoreNames.contains(STORES.DECKS)) {
					const deckStore = db.createObjectStore(STORES.DECKS, { keyPath: 'name' });
					deckStore.createIndex('format', 'format', { unique: false });
					deckStore.createIndex('updatedAt', 'updatedAt', { unique: false });
					deckStore.createIndex('folderPath', 'folderPath', { unique: false });
				}

				// Versions store
				if (!db.objectStoreNames.contains(STORES.VERSIONS)) {
					const versionStore = db.createObjectStore(STORES.VERSIONS, { keyPath: 'id' });
					versionStore.createIndex('deckName', 'deckName', { unique: false });
					versionStore.createIndex('branch', 'branch', { unique: false });
					versionStore.createIndex('deckBranch', ['deckName', 'branch'], { unique: false });
					versionStore.createIndex('isBase', 'isBase', { unique: false });
				}

				// Maybeboards store
				if (!db.objectStoreNames.contains(STORES.MAYBEBOARDS)) {
					db.createObjectStore(STORES.MAYBEBOARDS, { keyPath: 'deckName' });
				}

				// Stashes store
				if (!db.objectStoreNames.contains(STORES.STASHES)) {
					const stashStore = db.createObjectStore(STORES.STASHES, { keyPath: 'id' });
					stashStore.createIndex('deckName', 'deckName', { unique: false });
				}

				// Folder handles store
				if (!db.objectStoreNames.contains(STORES.FOLDER_HANDLES)) {
					db.createObjectStore(STORES.FOLDER_HANDLES, { keyPath: 'id' });
				}
			};
		});

		return this.dbPromise;
	}

	// ==================== Deck Operations ====================

	/**
	 * Save or update a deck
	 */
	async saveDeck(deck: StoredDeck): Promise<void> {
		const db = await this.getDb();
		const tx = db.transaction([STORES.DECKS], 'readwrite');
		const store = tx.objectStore(STORES.DECKS);

		await new Promise<void>((resolve, reject) => {
			const request = store.put(deck);
			request.onsuccess = () => resolve();
			request.onerror = () => reject(request.error);
		});
	}

	/**
	 * Get a deck by name
	 */
	async getDeck(name: string): Promise<StoredDeck | null> {
		const db = await this.getDb();
		const tx = db.transaction([STORES.DECKS], 'readonly');
		const store = tx.objectStore(STORES.DECKS);

		return new Promise((resolve, reject) => {
			const request = store.get(name);
			request.onsuccess = () => resolve(request.result ?? null);
			request.onerror = () => reject(request.error);
		});
	}

	/**
	 * List all decks
	 */
	async listDecks(): Promise<StoredDeck[]> {
		const db = await this.getDb();
		const tx = db.transaction([STORES.DECKS], 'readonly');
		const store = tx.objectStore(STORES.DECKS);

		return new Promise((resolve, reject) => {
			const request = store.getAll();
			request.onsuccess = () => resolve(request.result);
			request.onerror = () => reject(request.error);
		});
	}

	/**
	 * Delete a deck and all associated data
	 */
	async deleteDeck(name: string): Promise<void> {
		const db = await this.getDb();
		const tx = db.transaction(
			[STORES.DECKS, STORES.VERSIONS, STORES.MAYBEBOARDS, STORES.STASHES],
			'readwrite'
		);

		// Delete deck record
		const deckStore = tx.objectStore(STORES.DECKS);
		await new Promise<void>((resolve, reject) => {
			const request = deckStore.delete(name);
			request.onsuccess = () => resolve();
			request.onerror = () => reject(request.error);
		});

		// Delete all versions for this deck
		const versionStore = tx.objectStore(STORES.VERSIONS);
		const versionIndex = versionStore.index('deckName');
		const versionKeys = await new Promise<IDBValidKey[]>((resolve, reject) => {
			const request = versionIndex.getAllKeys(name);
			request.onsuccess = () => resolve(request.result);
			request.onerror = () => reject(request.error);
		});
		for (const key of versionKeys) {
			await new Promise<void>((resolve, reject) => {
				const request = versionStore.delete(key);
				request.onsuccess = () => resolve();
				request.onerror = () => reject(request.error);
			});
		}

		// Delete maybeboard
		const maybeboardStore = tx.objectStore(STORES.MAYBEBOARDS);
		await new Promise<void>((resolve, reject) => {
			const request = maybeboardStore.delete(name);
			request.onsuccess = () => resolve();
			request.onerror = () => reject(request.error);
		});

		// Delete all stashes for this deck
		const stashStore = tx.objectStore(STORES.STASHES);
		const stashIndex = stashStore.index('deckName');
		const stashKeys = await new Promise<IDBValidKey[]>((resolve, reject) => {
			const request = stashIndex.getAllKeys(name);
			request.onsuccess = () => resolve(request.result);
			request.onerror = () => reject(request.error);
		});
		for (const key of stashKeys) {
			await new Promise<void>((resolve, reject) => {
				const request = stashStore.delete(key);
				request.onsuccess = () => resolve();
				request.onerror = () => reject(request.error);
			});
		}
	}

	/**
	 * Check if a deck exists
	 */
	async deckExists(name: string): Promise<boolean> {
		const deck = await this.getDeck(name);
		return deck !== null;
	}

	// ==================== Version Operations ====================

	/**
	 * Save a version (base or delta)
	 */
	async saveVersion(version: StoredVersion): Promise<void> {
		const db = await this.getDb();
		const tx = db.transaction([STORES.VERSIONS], 'readwrite');
		const store = tx.objectStore(STORES.VERSIONS);

		await new Promise<void>((resolve, reject) => {
			const request = store.put(version);
			request.onsuccess = () => resolve();
			request.onerror = () => reject(request.error);
		});
	}

	/**
	 * Get a specific version
	 */
	async getVersion(deckName: string, branch: string, version: string): Promise<StoredVersion | null> {
		const db = await this.getDb();
		const tx = db.transaction([STORES.VERSIONS], 'readonly');
		const store = tx.objectStore(STORES.VERSIONS);

		const id = `${deckName}/${branch}/${version}`;
		return new Promise((resolve, reject) => {
			const request = store.get(id);
			request.onsuccess = () => resolve(request.result ?? null);
			request.onerror = () => reject(request.error);
		});
	}

	/**
	 * Get all versions for a deck branch
	 */
	async getVersionsForBranch(deckName: string, branch: string): Promise<StoredVersion[]> {
		const db = await this.getDb();
		const tx = db.transaction([STORES.VERSIONS], 'readonly');
		const store = tx.objectStore(STORES.VERSIONS);
		const index = store.index('deckBranch');

		return new Promise((resolve, reject) => {
			const request = index.getAll([deckName, branch]);
			request.onsuccess = () => resolve(request.result);
			request.onerror = () => reject(request.error);
		});
	}

	/**
	 * Get all base versions for a deck
	 */
	async getBaseVersions(deckName: string): Promise<StoredVersion[]> {
		const db = await this.getDb();
		const tx = db.transaction([STORES.VERSIONS], 'readonly');
		const store = tx.objectStore(STORES.VERSIONS);
		const deckIndex = store.index('deckName');

		const allVersions = await new Promise<StoredVersion[]>((resolve, reject) => {
			const request = deckIndex.getAll(deckName);
			request.onsuccess = () => resolve(request.result);
			request.onerror = () => reject(request.error);
		});

		return allVersions.filter((v) => v.isBase);
	}

	/**
	 * Delete a specific version
	 */
	async deleteVersion(deckName: string, branch: string, version: string): Promise<void> {
		const db = await this.getDb();
		const tx = db.transaction([STORES.VERSIONS], 'readwrite');
		const store = tx.objectStore(STORES.VERSIONS);

		const id = `${deckName}/${branch}/${version}`;
		await new Promise<void>((resolve, reject) => {
			const request = store.delete(id);
			request.onsuccess = () => resolve();
			request.onerror = () => reject(request.error);
		});
	}

	// ==================== Maybeboard Operations ====================

	/**
	 * Save maybeboard
	 */
	async saveMaybeboard(deckName: string, maybeboard: MaybeboardReference): Promise<void> {
		const db = await this.getDb();
		const tx = db.transaction([STORES.MAYBEBOARDS], 'readwrite');
		const store = tx.objectStore(STORES.MAYBEBOARDS);

		const record: StoredMaybeboard = {
			deckName,
			maybeboard,
			updatedAt: Date.now()
		};

		await new Promise<void>((resolve, reject) => {
			const request = store.put(record);
			request.onsuccess = () => resolve();
			request.onerror = () => reject(request.error);
		});
	}

	/**
	 * Get maybeboard
	 */
	async getMaybeboard(deckName: string): Promise<MaybeboardReference | null> {
		const db = await this.getDb();
		const tx = db.transaction([STORES.MAYBEBOARDS], 'readonly');
		const store = tx.objectStore(STORES.MAYBEBOARDS);

		const record = await new Promise<StoredMaybeboard | undefined>((resolve, reject) => {
			const request = store.get(deckName);
			request.onsuccess = () => resolve(request.result);
			request.onerror = () => reject(request.error);
		});

		return record?.maybeboard ?? null;
	}

	// ==================== Stash Operations ====================

	/**
	 * Save stash
	 */
	async saveStash(deckName: string, branch: string, stash: StashReference): Promise<void> {
		const db = await this.getDb();
		const tx = db.transaction([STORES.STASHES], 'readwrite');
		const store = tx.objectStore(STORES.STASHES);

		const record: StoredStash = {
			id: `${deckName}/${branch}`,
			deckName,
			branch,
			stash
		};

		await new Promise<void>((resolve, reject) => {
			const request = store.put(record);
			request.onsuccess = () => resolve();
			request.onerror = () => reject(request.error);
		});
	}

	/**
	 * Get stash
	 */
	async getStash(deckName: string, branch: string): Promise<StashReference | null> {
		const db = await this.getDb();
		const tx = db.transaction([STORES.STASHES], 'readonly');
		const store = tx.objectStore(STORES.STASHES);

		const id = `${deckName}/${branch}`;
		const record = await new Promise<StoredStash | undefined>((resolve, reject) => {
			const request = store.get(id);
			request.onsuccess = () => resolve(request.result);
			request.onerror = () => reject(request.error);
		});

		return record?.stash ?? null;
	}

	/**
	 * Delete stash
	 */
	async deleteStash(deckName: string, branch: string): Promise<void> {
		const db = await this.getDb();
		const tx = db.transaction([STORES.STASHES], 'readwrite');
		const store = tx.objectStore(STORES.STASHES);

		const id = `${deckName}/${branch}`;
		await new Promise<void>((resolve, reject) => {
			const request = store.delete(id);
			request.onsuccess = () => resolve();
			request.onerror = () => reject(request.error);
		});
	}

	// ==================== Folder Handle Operations ====================

	/**
	 * Save folder handle
	 */
	async saveFolderHandle(id: string, handle: FileSystemDirectoryHandle, path: string): Promise<void> {
		const db = await this.getDb();
		const tx = db.transaction([STORES.FOLDER_HANDLES], 'readwrite');
		const store = tx.objectStore(STORES.FOLDER_HANDLES);

		const record: StoredFolderHandle = {
			id,
			handle,
			path,
			lastUsed: Date.now()
		};

		await new Promise<void>((resolve, reject) => {
			const request = store.put(record);
			request.onsuccess = () => resolve();
			request.onerror = () => reject(request.error);
		});
	}

	/**
	 * Get folder handle
	 */
	async getFolderHandle(id: string): Promise<StoredFolderHandle | null> {
		const db = await this.getDb();
		const tx = db.transaction([STORES.FOLDER_HANDLES], 'readonly');
		const store = tx.objectStore(STORES.FOLDER_HANDLES);

		return new Promise((resolve, reject) => {
			const request = store.get(id);
			request.onsuccess = () => resolve(request.result ?? null);
			request.onerror = () => reject(request.error);
		});
	}

	/**
	 * Delete folder handle
	 */
	async deleteFolderHandle(id: string): Promise<void> {
		const db = await this.getDb();
		const tx = db.transaction([STORES.FOLDER_HANDLES], 'readwrite');
		const store = tx.objectStore(STORES.FOLDER_HANDLES);

		await new Promise<void>((resolve, reject) => {
			const request = store.delete(id);
			request.onsuccess = () => resolve();
			request.onerror = () => reject(request.error);
		});
	}

	/**
	 * Get the default folder handle
	 */
	async getDefaultFolderHandle(): Promise<StoredFolderHandle | null> {
		return this.getFolderHandle('default');
	}

	/**
	 * Save the default folder handle
	 */
	async saveDefaultFolderHandle(handle: FileSystemDirectoryHandle, path: string): Promise<void> {
		return this.saveFolderHandle('default', handle, path);
	}

	// ==================== Utility Operations ====================

	/**
	 * Get database statistics
	 */
	async getStats(): Promise<{
		deckCount: number;
		versionCount: number;
		baseVersionCount: number;
		maybeboardCount: number;
		stashCount: number;
		hasFolderHandle: boolean;
	}> {
		const db = await this.getDb();
		const tx = db.transaction(
			[STORES.DECKS, STORES.VERSIONS, STORES.MAYBEBOARDS, STORES.STASHES, STORES.FOLDER_HANDLES],
			'readonly'
		);

		const [deckCount, versions, maybeboardCount, stashCount, folderHandles] = await Promise.all([
			new Promise<number>((resolve, reject) => {
				const request = tx.objectStore(STORES.DECKS).count();
				request.onsuccess = () => resolve(request.result);
				request.onerror = () => reject(request.error);
			}),
			new Promise<StoredVersion[]>((resolve, reject) => {
				const request = tx.objectStore(STORES.VERSIONS).getAll();
				request.onsuccess = () => resolve(request.result);
				request.onerror = () => reject(request.error);
			}),
			new Promise<number>((resolve, reject) => {
				const request = tx.objectStore(STORES.MAYBEBOARDS).count();
				request.onsuccess = () => resolve(request.result);
				request.onerror = () => reject(request.error);
			}),
			new Promise<number>((resolve, reject) => {
				const request = tx.objectStore(STORES.STASHES).count();
				request.onsuccess = () => resolve(request.result);
				request.onerror = () => reject(request.error);
			}),
			new Promise<number>((resolve, reject) => {
				const request = tx.objectStore(STORES.FOLDER_HANDLES).count();
				request.onsuccess = () => resolve(request.result);
				request.onerror = () => reject(request.error);
			})
		]);

		return {
			deckCount,
			versionCount: versions.length,
			baseVersionCount: versions.filter((v) => v.isBase).length,
			maybeboardCount,
			stashCount,
			hasFolderHandle: folderHandles > 0
		};
	}

	/**
	 * Clear all data (use with caution!)
	 */
	async clearAll(): Promise<void> {
		const db = await this.getDb();
		const tx = db.transaction(
			[STORES.DECKS, STORES.VERSIONS, STORES.MAYBEBOARDS, STORES.STASHES, STORES.FOLDER_HANDLES],
			'readwrite'
		);

		await Promise.all([
			new Promise<void>((resolve, reject) => {
				const request = tx.objectStore(STORES.DECKS).clear();
				request.onsuccess = () => resolve();
				request.onerror = () => reject(request.error);
			}),
			new Promise<void>((resolve, reject) => {
				const request = tx.objectStore(STORES.VERSIONS).clear();
				request.onsuccess = () => resolve();
				request.onerror = () => reject(request.error);
			}),
			new Promise<void>((resolve, reject) => {
				const request = tx.objectStore(STORES.MAYBEBOARDS).clear();
				request.onsuccess = () => resolve();
				request.onerror = () => reject(request.error);
			}),
			new Promise<void>((resolve, reject) => {
				const request = tx.objectStore(STORES.STASHES).clear();
				request.onsuccess = () => resolve();
				request.onerror = () => reject(request.error);
			}),
			new Promise<void>((resolve, reject) => {
				const request = tx.objectStore(STORES.FOLDER_HANDLES).clear();
				request.onsuccess = () => resolve();
				request.onerror = () => reject(request.error);
			})
		]);
	}
}

// Export singleton instance
export const deckDatabase = new DeckDatabase();
