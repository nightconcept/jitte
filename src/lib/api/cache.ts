/**
 * IndexedDB cache for Scryfall card data and images
 * Implements 24-hour cache for card data and persistent image cache
 */

import type { ScryfallCard, ScryfallSet } from '../types/scryfall';

const DB_NAME = 'jitte-card-cache';
const DB_VERSION = 2;
const CARD_STORE = 'cards';
const IMAGE_STORE = 'images';
const BULK_DATA_STORE = 'bulk-data';
const SET_STORE = 'sets';

// Cache duration: 24 hours for card data
const CARD_CACHE_DURATION_MS = 24 * 60 * 60 * 1000;
// Cache duration: 7 days for set metadata
const SET_CACHE_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

interface CachedCard {
	id: string;
	card: ScryfallCard;
	cachedAt: number;
}

interface CachedImage {
	url: string;
	blob: Blob;
	cachedAt: number;
}

interface CachedBulkData {
	type: string;
	data: ScryfallCard[];
	cachedAt: number;
}

interface CachedSet {
	code: string;
	set: ScryfallSet;
	cachedAt: number;
}

/**
 * IndexedDB cache manager
 */
export class CardCache {
	private dbPromise: Promise<IDBDatabase> | null = null;

	/**
	 * Initialize the IndexedDB database
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

				// Card data store
				if (!db.objectStoreNames.contains(CARD_STORE)) {
					const cardStore = db.createObjectStore(CARD_STORE, { keyPath: 'id' });
					cardStore.createIndex('cachedAt', 'cachedAt', { unique: false });
				}

				// Image blob store
				if (!db.objectStoreNames.contains(IMAGE_STORE)) {
					const imageStore = db.createObjectStore(IMAGE_STORE, { keyPath: 'url' });
					imageStore.createIndex('cachedAt', 'cachedAt', { unique: false });
				}

				// Bulk data store
				if (!db.objectStoreNames.contains(BULK_DATA_STORE)) {
					const bulkStore = db.createObjectStore(BULK_DATA_STORE, { keyPath: 'type' });
					bulkStore.createIndex('cachedAt', 'cachedAt', { unique: false });
				}

				// Set metadata store
				if (!db.objectStoreNames.contains(SET_STORE)) {
					const setStore = db.createObjectStore(SET_STORE, { keyPath: 'code' });
					setStore.createIndex('cachedAt', 'cachedAt', { unique: false });
				}
			};
		});

		return this.dbPromise;
	}

	/**
	 * Cache a card object
	 */
	async cacheCard(card: ScryfallCard): Promise<void> {
		const db = await this.getDb();
		const transaction = db.transaction([CARD_STORE], 'readwrite');
		const store = transaction.objectStore(CARD_STORE);

		const cached: CachedCard = {
			id: card.id,
			card,
			cachedAt: Date.now()
		};

		await new Promise<void>((resolve, reject) => {
			const request = store.put(cached);
			request.onsuccess = () => resolve();
			request.onerror = () => reject(request.error);
		});
	}

	/**
	 * Get a cached card if it exists and is fresh
	 */
	async getCard(id: string): Promise<ScryfallCard | null> {
		const db = await this.getDb();
		const transaction = db.transaction([CARD_STORE], 'readonly');
		const store = transaction.objectStore(CARD_STORE);

		const cached = await new Promise<CachedCard | undefined>((resolve, reject) => {
			const request = store.get(id);
			request.onsuccess = () => resolve(request.result);
			request.onerror = () => reject(request.error);
		});

		if (!cached) {
			return null;
		}

		// Check if cache is stale
		const age = Date.now() - cached.cachedAt;
		if (age > CARD_CACHE_DURATION_MS) {
			// Cache is stale, delete it
			await this.deleteCard(id);
			return null;
		}

		return cached.card;
	}

	/**
	 * Delete a cached card
	 */
	async deleteCard(id: string): Promise<void> {
		const db = await this.getDb();
		const transaction = db.transaction([CARD_STORE], 'readwrite');
		const store = transaction.objectStore(CARD_STORE);

		await new Promise<void>((resolve, reject) => {
			const request = store.delete(id);
			request.onsuccess = () => resolve();
			request.onerror = () => reject(request.error);
		});
	}

	/**
	 * Cache an image blob
	 */
	async cacheImage(url: string, blob: Blob): Promise<void> {
		const db = await this.getDb();
		const transaction = db.transaction([IMAGE_STORE], 'readwrite');
		const store = transaction.objectStore(IMAGE_STORE);

		const cached: CachedImage = {
			url,
			blob,
			cachedAt: Date.now()
		};

		await new Promise<void>((resolve, reject) => {
			const request = store.put(cached);
			request.onsuccess = () => resolve();
			request.onerror = () => reject(request.error);
		});
	}

	/**
	 * Get a cached image blob
	 */
	async getImage(url: string): Promise<Blob | null> {
		const db = await this.getDb();
		const transaction = db.transaction([IMAGE_STORE], 'readonly');
		const store = transaction.objectStore(IMAGE_STORE);

		const cached = await new Promise<CachedImage | undefined>((resolve, reject) => {
			const request = store.get(url);
			request.onsuccess = () => resolve(request.result);
			request.onerror = () => reject(request.error);
		});

		return cached?.blob ?? null;
	}

	/**
	 * Cache bulk data
	 */
	async cacheBulkData(type: string, data: ScryfallCard[]): Promise<void> {
		const db = await this.getDb();
		const transaction = db.transaction([BULK_DATA_STORE], 'readwrite');
		const store = transaction.objectStore(BULK_DATA_STORE);

		const cached: CachedBulkData = {
			type,
			data,
			cachedAt: Date.now()
		};

		await new Promise<void>((resolve, reject) => {
			const request = store.put(cached);
			request.onsuccess = () => resolve();
			request.onerror = () => reject(request.error);
		});
	}

	/**
	 * Get cached bulk data if it exists and is fresh (24 hours)
	 */
	async getBulkData(type: string): Promise<ScryfallCard[] | null> {
		const db = await this.getDb();
		const transaction = db.transaction([BULK_DATA_STORE], 'readonly');
		const store = transaction.objectStore(BULK_DATA_STORE);

		const cached = await new Promise<CachedBulkData | undefined>((resolve, reject) => {
			const request = store.get(type);
			request.onsuccess = () => resolve(request.result);
			request.onerror = () => reject(request.error);
		});

		if (!cached) {
			return null;
		}

		// Check if cache is stale (24 hours)
		const age = Date.now() - cached.cachedAt;
		if (age > CARD_CACHE_DURATION_MS) {
			await this.deleteBulkData(type);
			return null;
		}

		return cached.data;
	}

	/**
	 * Delete cached bulk data
	 */
	async deleteBulkData(type: string): Promise<void> {
		const db = await this.getDb();
		const transaction = db.transaction([BULK_DATA_STORE], 'readwrite');
		const store = transaction.objectStore(BULK_DATA_STORE);

		await new Promise<void>((resolve, reject) => {
			const request = store.delete(type);
			request.onsuccess = () => resolve();
			request.onerror = () => reject(request.error);
		});
	}

	/**
	 * Cache a set object
	 */
	async cacheSet(set: ScryfallSet): Promise<void> {
		const db = await this.getDb();
		const transaction = db.transaction([SET_STORE], 'readwrite');
		const store = transaction.objectStore(SET_STORE);

		const cached: CachedSet = {
			code: set.code.toLowerCase(),
			set,
			cachedAt: Date.now()
		};

		await new Promise<void>((resolve, reject) => {
			const request = store.put(cached);
			request.onsuccess = () => resolve();
			request.onerror = () => reject(request.error);
		});
	}

	/**
	 * Get a cached set if it exists and is fresh (7 days)
	 */
	async getSet(code: string): Promise<ScryfallSet | null> {
		const db = await this.getDb();
		const transaction = db.transaction([SET_STORE], 'readonly');
		const store = transaction.objectStore(SET_STORE);

		const cached = await new Promise<CachedSet | undefined>((resolve, reject) => {
			const request = store.get(code.toLowerCase());
			request.onsuccess = () => resolve(request.result);
			request.onerror = () => reject(request.error);
		});

		if (!cached) {
			return null;
		}

		// Check if cache is stale (7 days)
		const age = Date.now() - cached.cachedAt;
		if (age > SET_CACHE_DURATION_MS) {
			await this.deleteSet(code);
			return null;
		}

		return cached.set;
	}

	/**
	 * Delete a cached set
	 */
	async deleteSet(code: string): Promise<void> {
		const db = await this.getDb();
		const transaction = db.transaction([SET_STORE], 'readwrite');
		const store = transaction.objectStore(SET_STORE);

		await new Promise<void>((resolve, reject) => {
			const request = store.delete(code.toLowerCase());
			request.onsuccess = () => resolve();
			request.onerror = () => reject(request.error);
		});
	}

	/**
	 * Clear all caches
	 */
	async clearAll(): Promise<void> {
		const db = await this.getDb();
		const transaction = db.transaction([CARD_STORE, IMAGE_STORE, BULK_DATA_STORE, SET_STORE], 'readwrite');

		await Promise.all([
			new Promise<void>((resolve, reject) => {
				const request = transaction.objectStore(CARD_STORE).clear();
				request.onsuccess = () => resolve();
				request.onerror = () => reject(request.error);
			}),
			new Promise<void>((resolve, reject) => {
				const request = transaction.objectStore(IMAGE_STORE).clear();
				request.onsuccess = () => resolve();
				request.onerror = () => reject(request.error);
			}),
			new Promise<void>((resolve, reject) => {
				const request = transaction.objectStore(BULK_DATA_STORE).clear();
				request.onsuccess = () => resolve();
				request.onerror = () => reject(request.error);
			}),
			new Promise<void>((resolve, reject) => {
				const request = transaction.objectStore(SET_STORE).clear();
				request.onsuccess = () => resolve();
				request.onerror = () => reject(request.error);
			})
		]);
	}

	/**
	 * Get cache statistics
	 */
	async getStats(): Promise<{
		cardCount: number;
		imageCount: number;
		bulkDataTypes: string[];
		setCount: number;
	}> {
		const db = await this.getDb();
		const transaction = db.transaction([CARD_STORE, IMAGE_STORE, BULK_DATA_STORE, SET_STORE], 'readonly');

		const [cardCount, imageCount, bulkData, setCount] = await Promise.all([
			new Promise<number>((resolve, reject) => {
				const request = transaction.objectStore(CARD_STORE).count();
				request.onsuccess = () => resolve(request.result);
				request.onerror = () => reject(request.error);
			}),
			new Promise<number>((resolve, reject) => {
				const request = transaction.objectStore(IMAGE_STORE).count();
				request.onsuccess = () => resolve(request.result);
				request.onerror = () => reject(request.error);
			}),
			new Promise<string[]>((resolve, reject) => {
				const request = transaction.objectStore(BULK_DATA_STORE).getAllKeys();
				request.onsuccess = () => resolve(request.result as string[]);
				request.onerror = () => reject(request.error);
			}),
			new Promise<number>((resolve, reject) => {
				const request = transaction.objectStore(SET_STORE).count();
				request.onsuccess = () => resolve(request.result);
				request.onerror = () => reject(request.error);
			})
		]);

		return {
			cardCount,
			imageCount,
			bulkDataTypes: bulkData,
			setCount
		};
	}
}

// Export singleton instance
export const cardCache = new CardCache();
