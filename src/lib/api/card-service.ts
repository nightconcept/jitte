/**
 * High-level card service that combines API client with caching
 * This is the main interface for card operations in the application
 */

import { scryfallClient, ScryfallApiError } from './scryfall-client';
import { cardCache } from './cache';
import type { ScryfallCard, ScryfallSet } from '../types/scryfall';
import { MIN_SEARCH_CHARACTERS } from '../constants/search';

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
	color_identity?: string[]; // Color identity for Commander validation
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
	 * Returns results formatted for display
	 * @param query - Search query
	 * @param limit - Maximum number of results to return (default: 10)
	 * @param commanderLegalOnly - If true, only return Commander-legal cards (default: false)
	 */
	async searchCards(query: string, limit = 10, commanderLegalOnly = false): Promise<CardSearchResult[]> {
		if (query.length < MIN_SEARCH_CHARACTERS) {
			return [];
		}

		try {
			// Add Commander-legal filter if requested
			const searchQuery = commanderLegalOnly
				? `${query} format:commander`
				: query;

			const results = await scryfallClient.search(searchQuery, {
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
	 * Search for cards with full details, fetching ALL pages
	 * Returns ALL results formatted for display (follows pagination)
	 * @param query - Search query
	 * @param commanderLegalOnly - If true, only return Commander-legal cards (default: false)
	 * @returns Object with all cards and total count
	 */
	async searchCardsAll(
		query: string,
		commanderLegalOnly = false
	): Promise<{ cards: CardSearchResult[]; totalCards: number }> {
		if (query.length < MIN_SEARCH_CHARACTERS) {
			return { cards: [], totalCards: 0 };
		}

		try {
			// Add Commander-legal filter if requested
			const searchQuery = commanderLegalOnly ? `${query} format:commander` : query;

			let allCards: CardSearchResult[] = [];
			let page = 1;
			let hasMore = true;

			// Fetch first page
			let results = await scryfallClient.search(searchQuery, {
				unique: 'cards',
				order: 'name',
				page
			});

			allCards.push(...results.data.map((card) => this.formatCardForSearch(card)));

			// Follow pagination to get all results
			while (results.has_more && results.next_page) {
				page++;
				results = await scryfallClient.search(searchQuery, {
					unique: 'cards',
					order: 'name',
					page
				});
				allCards.push(...results.data.map((card) => this.formatCardForSearch(card)));
			}

			return {
				cards: allCards,
				totalCards: results.total_cards ?? allCards.length
			};
		} catch (error) {
			if (error instanceof ScryfallApiError) {
				// No results found is not an error for UI purposes
				if (error.code === 'not_found') {
					return { cards: [], totalCards: 0 };
				}
			}
			console.error('Search error:', error);
			return { cards: [], totalCards: 0 };
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
	 * Get a card by set code and collector number (for specific printings)
	 * Falls back to name lookup if set/collector lookup fails
	 */
	async getCardBySetAndNumber(
		setCode: string,
		collectorNumber: string,
		fallbackName?: string
	): Promise<ScryfallCard | null> {
		try {
			const card = await scryfallClient.getCardBySetAndNumber(setCode, collectorNumber);
			await cardCache.cacheCard(card);
			return card;
		} catch (error) {
			console.error(`Get card by set/collector error (${setCode} ${collectorNumber}):`, error);

			// Fall back to name lookup if provided
			if (fallbackName) {
				console.log(`Falling back to name lookup: ${fallbackName}`);
				return this.getCardByName(fallbackName);
			}

			return null;
		}
	}

	/**
	 * Get multiple cards by name in batch (up to 75 per call)
	 * Much more efficient than individual requests
	 * @param names - Array of card names to fetch
	 * @returns Object with found cards (keyed by lowercase name) and array of not found names
	 */
	async getCardsByNames(names: string[]): Promise<{
		cards: Map<string, ScryfallCard>;
		notFound: string[];
	}> {
		const cards = new Map<string, ScryfallCard>();
		const notFound: string[] = [];

		// Split into batches of 75
		const batches: string[][] = [];
		for (let i = 0; i < names.length; i += 75) {
			batches.push(names.slice(i, i + 75));
		}

		// Process each batch
		for (const batch of batches) {
			try {
				const identifiers = batch.map((name) => ({ name }));
				const result = await scryfallClient.getCardCollection(identifiers);

				// Add found cards to map (keyed by lowercase name for easy lookup)
				for (const card of result.data) {
					await cardCache.cacheCard(card);
					cards.set(card.name.toLowerCase(), card);
				}

				// Track not found cards
				if (result.not_found && Array.isArray(result.not_found)) {
					for (const identifier of result.not_found) {
						if (typeof identifier === 'object' && identifier !== null && 'name' in identifier) {
							notFound.push((identifier as { name: string }).name);
						}
					}
				}
			} catch (error) {
				console.error('Get cards by names error:', error);
				// Add all cards in this batch to not found
				notFound.push(...batch);
			}
		}

		return { cards, notFound };
	}

	/**
	 * Get multiple cards in batch with set/collector support (up to 75 per call)
	 * Prefers set+collector when available, falls back to name only
	 * @param cardIdentifiers - Array of card identifiers with name and optional set/collector
	 * @returns Object with found cards and array of not found identifiers
	 */
	async getCardsBatch(cardIdentifiers: Array<{
		name: string;
		setCode?: string;
		collectorNumber?: string;
	}>): Promise<{
		cards: Map<string, ScryfallCard>;
		notFound: Array<{ name: string; setCode?: string; collectorNumber?: string }>;
	}> {
		const cards = new Map<string, ScryfallCard>();
		const notFound: Array<{ name: string; setCode?: string; collectorNumber?: string }> = [];

		// Create a lookup map from input
		const inputMap = new Map<string, typeof cardIdentifiers[0]>();
		for (const card of cardIdentifiers) {
			const key = card.setCode && card.collectorNumber
				? `${card.setCode}|${card.collectorNumber}`.toLowerCase()
				: card.name.toLowerCase();
			inputMap.set(key, card);
		}

		// Split into batches of 75
		const batches: typeof cardIdentifiers[] = [];
		for (let i = 0; i < cardIdentifiers.length; i += 75) {
			batches.push(cardIdentifiers.slice(i, i + 75));
		}

		// Process each batch
		for (const batch of batches) {
			try {
				const identifiers = batch.map((card) => {
					// Prefer set+collector, fallback to name
					if (card.setCode && card.collectorNumber) {
						return {
							set: card.setCode.toLowerCase(),
							collector_number: card.collectorNumber
						};
					}
					return { name: card.name };
				});

				const result = await scryfallClient.getCardCollection(identifiers);

				// Add found cards to map
				for (const card of result.data) {
					await cardCache.cacheCard(card);
					// Key by set+collector if available, otherwise by name
					const key = `${card.set}|${card.collector_number}`.toLowerCase();
					cards.set(key, card);
					// Also add by name for fallback lookups
					cards.set(card.name.toLowerCase(), card);
				}

				// Track not found cards
				if (result.not_found && Array.isArray(result.not_found)) {
					for (const identifier of result.not_found) {
						if (typeof identifier === 'object' && identifier !== null) {
							const typedId = identifier as any;
							if ('set' in typedId && 'collector_number' in typedId) {
								const key = `${typedId.set}|${typedId.collector_number}`.toLowerCase();
								const original = inputMap.get(key);
								if (original) notFound.push(original);
							} else if ('name' in typedId) {
								const key = typedId.name.toLowerCase();
								const original = inputMap.get(key);
								if (original) notFound.push(original);
							}
						}
					}
				}
			} catch (error) {
				console.error('Get cards batch error:', error);
				// Add all cards in this batch to not found
				notFound.push(...batch);
			}
		}

		return { cards, notFound };
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
	 * Get set information by set code, with caching
	 * @param code - The set code (e.g., "cmm", "ltr")
	 */
	async getSetByCode(code: string): Promise<ScryfallSet | null> {
		// Try cache first
		const cached = await cardCache.getSet(code);
		if (cached) {
			return cached;
		}

		// Fetch from API
		try {
			const set = await scryfallClient.getSet(code);
			await cardCache.cacheSet(set);
			return set;
		} catch (error) {
			console.error('Get set error:', error);
			return null;
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
			collector_number: card.collector_number,
			color_identity: card.color_identity
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
