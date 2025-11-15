/**
 * Persistent cache for card image URLs using localStorage
 * Stores just the URLs (not the images themselves) to avoid re-fetching card data
 */

const CACHE_KEY = 'jitte-card-image-urls';
const CACHE_VERSION = 1;
const MAX_CACHE_SIZE = 1000; // Limit to 1000 entries to avoid localStorage bloat

interface ImageCacheEntry {
	url: string;
	cachedAt: number;
}

interface ImageCacheData {
	version: number;
	entries: Map<string, ImageCacheEntry>;
}

class ImageCache {
	private cache: Map<string, ImageCacheEntry> = new Map();
	private initialized = false;

	/**
	 * Initialize cache from localStorage
	 */
	private init() {
		if (this.initialized) return;

		try {
			const stored = localStorage.getItem(CACHE_KEY);
			if (stored) {
				const data = JSON.parse(stored) as { version: number; entries: [string, ImageCacheEntry][] };

				// Check version compatibility
				if (data.version === CACHE_VERSION) {
					this.cache = new Map(data.entries);
				}
			}
		} catch (error) {
			console.warn('[ImageCache] Failed to load cache from localStorage:', error);
			// Clear corrupted cache
			localStorage.removeItem(CACHE_KEY);
		}

		this.initialized = true;
	}

	/**
	 * Get an image URL from cache
	 */
	get(cardName: string): string | null {
		this.init();
		const entry = this.cache.get(cardName.toLowerCase());
		return entry?.url ?? null;
	}

	/**
	 * Store an image URL in cache
	 */
	set(cardName: string, imageUrl: string): void {
		this.init();

		// Enforce size limit by removing oldest entries
		if (this.cache.size >= MAX_CACHE_SIZE) {
			this.evictOldest();
		}

		this.cache.set(cardName.toLowerCase(), {
			url: imageUrl,
			cachedAt: Date.now()
		});

		this.persist();
	}

	/**
	 * Check if a card's image is cached
	 */
	has(cardName: string): boolean {
		this.init();
		return this.cache.has(cardName.toLowerCase());
	}

	/**
	 * Remove oldest 10% of entries when cache is full
	 */
	private evictOldest(): void {
		const entries = Array.from(this.cache.entries());
		entries.sort((a, b) => a[1].cachedAt - b[1].cachedAt);

		const toRemove = Math.floor(entries.length * 0.1);
		for (let i = 0; i < toRemove; i++) {
			this.cache.delete(entries[i][0]);
		}
	}

	/**
	 * Persist cache to localStorage
	 */
	private persist(): void {
		try {
			const data: { version: number; entries: [string, ImageCacheEntry][] } = {
				version: CACHE_VERSION,
				entries: Array.from(this.cache.entries())
			};
			localStorage.setItem(CACHE_KEY, JSON.stringify(data));
		} catch (error) {
			console.warn('[ImageCache] Failed to persist cache to localStorage:', error);
			// If localStorage is full, clear some space
			if (error instanceof DOMException && error.name === 'QuotaExceededError') {
				this.evictOldest();
				this.persist(); // Try again after eviction
			}
		}
	}

	/**
	 * Clear all cached images
	 */
	clear(): void {
		this.cache.clear();
		localStorage.removeItem(CACHE_KEY);
	}

	/**
	 * Get cache statistics
	 */
	getStats(): { size: number; maxSize: number } {
		this.init();
		return {
			size: this.cache.size,
			maxSize: MAX_CACHE_SIZE
		};
	}
}

// Export singleton instance
export const imageCache = new ImageCache();
