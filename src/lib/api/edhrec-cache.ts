/**
 * EDHREC Cache Layer
 *
 * Implements localStorage-based caching for EDHREC data to:
 * - Minimize requests to EDHREC (be respectful)
 * - Improve performance
 * - Reduce load times for repeated queries
 *
 * Cache TTLs:
 * - Commander data: 24 hours (changes infrequently)
 * - Salt scores: 7 days (updated annually)
 * - Top 100 salt list: 7 days
 */

import type { EDHRECCacheEntry } from '$lib/types/edhrec';

export class EDHRECCache {
	private storage: Storage | null;
	private readonly prefix = 'edhrec_cache_';

	constructor() {
		// Check if we're in browser environment
		this.storage = typeof window !== 'undefined' && window.localStorage ? localStorage : null;
	}

	/**
	 * Get cached data if exists and not expired
	 */
	get<T>(key: string): T | null {
		if (!this.storage) return null;

		try {
			const item = this.storage.getItem(this.prefix + key);
			if (!item) return null;

			const cached: EDHRECCacheEntry = JSON.parse(item);

			// Check if expired
			if (Date.now() - cached.timestamp > cached.ttl) {
				this.storage.removeItem(this.prefix + key);
				return null;
			}

			return cached.data as T;
		} catch (error) {
			console.warn(`Error reading EDHREC cache for key ${key}:`, error);
			return null;
		}
	}

	/**
	 * Store data in cache with TTL
	 */
	set(key: string, data: unknown, ttl: number): void {
		if (!this.storage) return;

		const cached: EDHRECCacheEntry = {
			timestamp: Date.now(),
			ttl,
			data: data as EDHRECCacheEntry['data']
		};

		try {
			this.storage.setItem(this.prefix + key, JSON.stringify(cached));
		} catch (error) {
			// Handle quota exceeded error
			if (error instanceof DOMException && error.name === 'QuotaExceededError') {
				console.warn('EDHREC cache full, clearing old entries');
				this.clearOldEntries();

				// Try again after clearing
				try {
					this.storage.setItem(this.prefix + key, JSON.stringify(cached));
				} catch {
					console.error('Could not cache EDHREC data after clearing old entries');
				}
			} else {
				console.error('Error caching EDHREC data:', error);
			}
		}
	}

	/**
	 * Check if key exists in cache (regardless of expiration)
	 */
	has(key: string): boolean {
		if (!this.storage) return false;
		return this.storage.getItem(this.prefix + key) !== null;
	}

	/**
	 * Remove specific cache entry
	 */
	remove(key: string): void {
		if (!this.storage) return;
		this.storage.removeItem(this.prefix + key);
	}

	/**
	 * Clear all EDHREC cache entries
	 */
	clear(): void {
		if (!this.storage) return;

		const keys = Object.keys(this.storage).filter((k) => k.startsWith(this.prefix));
		keys.forEach((key) => this.storage!.removeItem(key));
	}

	/**
	 * Clear oldest 25% of cache entries to make room
	 * Called when localStorage quota is exceeded
	 */
	private clearOldEntries(): void {
		if (!this.storage) return;

		try {
			const keys = Object.keys(this.storage).filter((k) => k.startsWith(this.prefix));

			const entries = keys
				.map((key) => {
					try {
						const data = JSON.parse(this.storage!.getItem(key)!) as EDHRECCacheEntry;
						return { key, timestamp: data.timestamp };
					} catch {
						return null;
					}
				})
				.filter((entry): entry is { key: string; timestamp: number } => entry !== null);

			// Sort by timestamp (oldest first)
			entries.sort((a, b) => a.timestamp - b.timestamp);

			// Remove oldest 25%
			const toRemove = Math.ceil(entries.length * 0.25);
			for (let i = 0; i < toRemove; i++) {
				this.storage.removeItem(entries[i].key);
			}

			console.log(`Cleared ${toRemove} old EDHREC cache entries`);
		} catch (error) {
			console.error('Error clearing old cache entries:', error);
		}
	}

	/**
	 * Get cache statistics (for debugging/monitoring)
	 */
	getStats(): {
		totalEntries: number;
		totalSize: number;
		oldestEntry: number | null;
		newestEntry: number | null;
	} {
		if (!this.storage) {
			return { totalEntries: 0, totalSize: 0, oldestEntry: null, newestEntry: null };
		}

		const keys = Object.keys(this.storage).filter((k) => k.startsWith(this.prefix));

		let totalSize = 0;
		let oldestEntry: number | null = null;
		let newestEntry: number | null = null;

		keys.forEach((key) => {
			try {
				const item = this.storage!.getItem(key);
				if (item) {
					totalSize += item.length;
					const cached = JSON.parse(item) as EDHRECCacheEntry;

					if (oldestEntry === null || cached.timestamp < oldestEntry) {
						oldestEntry = cached.timestamp;
					}
					if (newestEntry === null || cached.timestamp > newestEntry) {
						newestEntry = cached.timestamp;
					}
				}
			} catch {
				// Ignore parse errors
			}
		});

		return {
			totalEntries: keys.length,
			totalSize,
			oldestEntry,
			newestEntry
		};
	}
}
