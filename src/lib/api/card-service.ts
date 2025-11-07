/**
 * High-level card service that combines API client with caching
 * This is the main interface for card operations in the application
 */

import { scryfallClient, ScryfallApiError } from './scryfall-client';
import { cardCache } from './cache';
import type { ScryfallCard } from '../types/scryfall';

export interface CardSearchResult {
	id: string;
	name: string;
	mana_cost?: string;
	type_line: string;
	oracle_text?: string;
	image_uri?: string;
	price_usd?: string;
	set: string;
	collector_number: string;
}

export interface BulkDataDownloadProgress {
	phase: 'fetching_metadata' | 'downloading' | 'parsing' | 'caching' | 'complete';
	progress: number; // 0-100
	message: string;
}

/**
 * Main card service for the application
 */
export class CardService {
	/**
	 * Search for card names (autocomplete)
	 */
	async autocomplete(query: string): Promise<string[]> {
		if (query.length < 2) {
			return [];
		}

		try {
			return await scryfallClient.autocomplete(query);
		} catch (error) {
			console.error('Autocomplete error:', error);
			return [];
		}
	}

	/**
	 * Search for cards with full details
	 * Returns top 10 results formatted for display
	 */
	async searchCards(query: string, limit = 10): Promise<CardSearchResult[]> {
		if (query.length < 4) {
			return [];
		}

		try {
			const results = await scryfallClient.search(query, {
				unique: 'cards',
				order: 'name'
			});

			return results.data.slice(0, limit).map((card) => this.formatCardForSearch(card));
		} catch (error) {
			if (error instanceof ScryfallApiError) {
				// No results found is not an error for UI purposes
				if (error.code === 'not_found') {
					return [];
				}
			}
			console.error('Search error:', error);
			return [];
		}
	}

	/**
	 * Get a card by exact name, with caching
	 */
	async getCardByName(name: string): Promise<ScryfallCard | null> {
		try {
			const card = await scryfallClient.getCardNamed(name, true);
			await cardCache.cacheCard(card);
			return card;
		} catch (error) {
			console.error('Get card by name error:', error);
			return null;
		}
	}

	/**
	 * Get a card by ID, with caching
	 */
	async getCard(id: string): Promise<ScryfallCard | null> {
		// Try cache first
		const cached = await cardCache.getCard(id);
		if (cached) {
			return cached;
		}

		// Fetch from API
		try {
			const card = await scryfallClient.getCard(id);
			await cardCache.cacheCard(card);
			return card;
		} catch (error) {
			console.error('Get card error:', error);
			return null;
		}
	}

	/**
	 * Get all printings of a card
	 */
	async getCardPrintings(oracleId: string): Promise<ScryfallCard[]> {
		try {
			const results = await scryfallClient.getCardPrintings(oracleId);
			// Cache all printings
			await Promise.all(results.data.map((card) => cardCache.cacheCard(card)));
			return results.data;
		} catch (error) {
			console.error('Get card printings error:', error);
			return [];
		}
	}

	/**
	 * Get and cache a card image
	 */
	async getCardImage(
		imageUrl: string,
		size: 'small' | 'normal' | 'large' | 'png' = 'normal'
	): Promise<string | null> {
		// Try cache first
		const cached = await cardCache.getImage(imageUrl);
		if (cached) {
			return URL.createObjectURL(cached);
		}

		// Fetch from network
		try {
			const response = await fetch(imageUrl);
			if (!response.ok) {
				throw new Error(`Failed to fetch image: ${response.statusText}`);
			}

			const blob = await response.blob();
			await cardCache.cacheImage(imageUrl, blob);
			return URL.createObjectURL(blob);
		} catch (error) {
			console.error('Get card image error:', error);
			return null;
		}
	}

	/**
	 * Download and cache Scryfall bulk data
	 * @param onProgress - Callback for download progress updates
	 */
	async downloadBulkData(
		onProgress?: (progress: BulkDataDownloadProgress) => void
	): Promise<boolean> {
		try {
			// Phase 1: Fetch metadata
			onProgress?.({
				phase: 'fetching_metadata',
				progress: 0,
				message: 'Fetching bulk data metadata...'
			});

			const bulkDataInfo = await scryfallClient.getBulkDataByType('default_cards');

			// Phase 2: Download
			onProgress?.({
				phase: 'downloading',
				progress: 0,
				message: `Downloading ${(bulkDataInfo.size / 1024 / 1024).toFixed(1)} MB...`
			});

			const response = await fetch(bulkDataInfo.download_uri);
			if (!response.ok) {
				throw new Error(`Failed to download: ${response.statusText}`);
			}

			// Phase 3: Parse
			onProgress?.({
				phase: 'parsing',
				progress: 50,
				message: 'Parsing card data...'
			});

			const data = (await response.json()) as ScryfallCard[];

			// Phase 4: Cache
			onProgress?.({
				phase: 'caching',
				progress: 75,
				message: `Caching ${data.length.toLocaleString()} cards...`
			});

			await cardCache.cacheBulkData('default_cards', data);

			// Complete
			onProgress?.({
				phase: 'complete',
				progress: 100,
				message: 'Bulk data download complete!'
			});

			return true;
		} catch (error) {
			console.error('Bulk data download error:', error);
			return false;
		}
	}

	/**
	 * Search in cached bulk data (offline mode)
	 */
	async searchBulkData(query: string, limit = 10): Promise<CardSearchResult[]> {
		const bulkData = await cardCache.getBulkData('default_cards');
		if (!bulkData) {
			return [];
		}

		const normalizedQuery = query.toLowerCase();
		const results = bulkData
			.filter((card) => card.name.toLowerCase().includes(normalizedQuery))
			.slice(0, limit)
			.map((card) => this.formatCardForSearch(card));

		return results;
	}

	/**
	 * Format a card for search results display
	 */
	private formatCardForSearch(card: ScryfallCard): CardSearchResult {
		// Get the best image URI
		let image_uri: string | undefined;
		if (card.image_uris?.normal) {
			image_uri = card.image_uris.normal;
		} else if (card.card_faces?.[0]?.image_uris?.normal) {
			image_uri = card.card_faces[0].image_uris.normal;
		}

		return {
			id: card.id,
			name: card.name,
			mana_cost: card.mana_cost ?? card.card_faces?.[0]?.mana_cost,
			type_line: card.type_line,
			oracle_text: card.oracle_text ?? card.card_faces?.[0]?.oracle_text,
			image_uri,
			price_usd: card.prices.usd ?? undefined,
			set: card.set,
			collector_number: card.collector_number
		};
	}

	/**
	 * Update rate limit configuration
	 */
	updateRateLimit(delayMs: number): void {
		scryfallClient.updateRateLimit(delayMs);
	}

	/**
	 * Get cache statistics
	 */
	async getCacheStats(): Promise<{
		cardCount: number;
		imageCount: number;
		bulkDataTypes: string[];
	}> {
		return cardCache.getStats();
	}

	/**
	 * Clear all caches
	 */
	async clearCache(): Promise<void> {
		await cardCache.clearAll();
	}
}

// Export singleton instance
export const cardService = new CardService();
