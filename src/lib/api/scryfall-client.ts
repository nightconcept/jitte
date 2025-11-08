/**
 * Scryfall API client with rate limiting and error handling
 * Documentation: https://scryfall.com/docs/api
 */

import { RateLimiter } from './rate-limiter';
import type {
	ScryfallCard,
	ScryfallList,
	ScryfallCatalog,
	ScryfallError,
	ScryfallBulkData
} from '../types/scryfall';

export interface ScryfallClientConfig {
	/** Base API URL (default: https://api.scryfall.com) */
	baseUrl?: string;
	/** Rate limit delay in ms (default: 100ms) */
	rateLimitMs?: number;
	/** User agent string for requests */
	userAgent?: string;
}

export class ScryfallApiError extends Error {
	constructor(
		message: string,
		public code: string,
		public status: number,
		public details: string
	) {
		super(message);
		this.name = 'ScryfallApiError';
	}
}

/**
 * Main Scryfall API client
 */
export class ScryfallClient {
	private baseUrl: string;
	private rateLimiter: RateLimiter;
	private userAgent: string;

	constructor(config: ScryfallClientConfig = {}) {
		this.baseUrl = config.baseUrl ?? 'https://api.scryfall.com';
		this.userAgent = config.userAgent ?? 'Jitte-MTG-Deck-Manager/1.0';
		this.rateLimiter = new RateLimiter({
			minDelayMs: config.rateLimitMs ?? 100
		});
	}

	/**
	 * Make a rate-limited GET request to the Scryfall API
	 */
	private async request<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
		return this.rateLimiter.execute(async () => {
			const url = new URL(endpoint, this.baseUrl);

			if (params) {
				for (const [key, value] of Object.entries(params)) {
					url.searchParams.append(key, value);
				}
			}

			const response = await fetch(url.toString(), {
				headers: {
					'User-Agent': this.userAgent,
					Accept: 'application/json'
				}
			});

			if (!response.ok) {
				const error = (await response.json()) as ScryfallError;
				throw new ScryfallApiError(error.details, error.code, error.status, error.details);
			}

			return response.json() as Promise<T>;
		});
	}

	/**
	 * Make a rate-limited POST request to the Scryfall API
	 */
	private async postRequest<T>(endpoint: string, body: unknown): Promise<T> {
		return this.rateLimiter.execute(async () => {
			const url = new URL(endpoint, this.baseUrl);

			const response = await fetch(url.toString(), {
				method: 'POST',
				headers: {
					'User-Agent': this.userAgent,
					'Content-Type': 'application/json',
					Accept: 'application/json'
				},
				body: JSON.stringify(body)
			});

			if (!response.ok) {
				const error = (await response.json()) as ScryfallError;
				throw new ScryfallApiError(error.details, error.code, error.status, error.details);
			}

			return response.json() as Promise<T>;
		});
	}

	/**
	 * Autocomplete card names
	 * @param query - Search query (min 2 characters)
	 * @param includeExtras - Include tokens, planes, etc.
	 * @returns Up to 20 card names
	 */
	async autocomplete(query: string, includeExtras = false): Promise<string[]> {
		if (query.length < 2) {
			return [];
		}

		const params: Record<string, string> = { q: query };
		if (includeExtras) {
			params.include_extras = 'true';
		}

		const result = await this.request<ScryfallCatalog>('/cards/autocomplete', params);
		return result.data;
	}

	/**
	 * Search for cards using fulltext search
	 * @param query - Scryfall search query
	 * @param options - Search options (unique, order, dir, etc.)
	 * @returns List of matching cards
	 */
	async search(
		query: string,
		options: {
			unique?: 'cards' | 'art' | 'prints';
			order?:
				| 'name'
				| 'set'
				| 'released'
				| 'rarity'
				| 'color'
				| 'usd'
				| 'tix'
				| 'eur'
				| 'cmc'
				| 'power'
				| 'toughness'
				| 'edhrec'
				| 'penny'
				| 'artist'
				| 'review';
			dir?: 'auto' | 'asc' | 'desc';
			includeExtras?: boolean;
			includeMultilingual?: boolean;
			includeVariations?: boolean;
			page?: number;
		} = {}
	): Promise<ScryfallList<ScryfallCard>> {
		const params: Record<string, string> = { q: query };

		if (options.unique) params.unique = options.unique;
		if (options.order) params.order = options.order;
		if (options.dir) params.dir = options.dir;
		if (options.includeExtras) params.include_extras = 'true';
		if (options.includeMultilingual) params.include_multilingual = 'true';
		if (options.includeVariations) params.include_variations = 'true';
		if (options.page) params.page = options.page.toString();

		return this.request<ScryfallList<ScryfallCard>>('/cards/search', params);
	}

	/**
	 * Get a specific card by ID
	 */
	async getCard(id: string): Promise<ScryfallCard> {
		return this.request<ScryfallCard>(`/cards/${id}`);
	}

	/**
	 * Get a card by name (exact match)
	 */
	async getCardNamed(name: string, exact = true): Promise<ScryfallCard> {
		const params: Record<string, string> = exact
			? { exact: name }
			: { fuzzy: name };

		return this.request<ScryfallCard>('/cards/named', params);
	}

	/**
	 * Get a card by set code and collector number
	 * @param setCode - The set code (e.g., "war", "2xm")
	 * @param collectorNumber - The collector number (e.g., "97", "54★")
	 */
	async getCardBySetAndNumber(setCode: string, collectorNumber: string): Promise<ScryfallCard> {
		return this.request<ScryfallCard>(`/cards/${setCode.toLowerCase()}/${collectorNumber}`);
	}

	/**
	 * Get multiple cards by collection lookup (batch request)
	 * Maximum 75 cards per request
	 * @param identifiers - Array of card identifiers (name, id, etc.)
	 * @returns List of cards with data and not_found array
	 */
	async getCardCollection(
		identifiers: Array<
			| { name: string }
			| { id: string }
			| { mtgo_id: number }
			| { multiverse_id: number }
			| { oracle_id: string }
			| { illustration_id: string }
			| { name: string; set: string }
			| { collector_number: string; set: string }
		>
	): Promise<ScryfallList<ScryfallCard> & { not_found?: unknown[] }> {
		if (identifiers.length > 75) {
			throw new Error('Maximum 75 card identifiers allowed per collection request');
		}

		return this.postRequest<ScryfallList<ScryfallCard> & { not_found?: unknown[] }>(
			'/cards/collection',
			{ identifiers }
		);
	}

	/**
	 * Get a random card
	 */
	async getRandomCard(query?: string): Promise<ScryfallCard> {
		const params = query ? { q: query } : undefined;
		return this.request<ScryfallCard>('/cards/random', params);
	}

	/**
	 * Get all printings of a card
	 */
	async getCardPrintings(oracleId: string): Promise<ScryfallList<ScryfallCard>> {
		return this.search(`oracleid:${oracleId}`, { unique: 'prints' });
	}

	/**
	 * Get bulk data file information
	 */
	async getBulkData(): Promise<ScryfallList<ScryfallBulkData>> {
		return this.request<ScryfallList<ScryfallBulkData>>('/bulk-data');
	}

	/**
	 * Get a specific bulk data file
	 */
	async getBulkDataByType(
		type: 'oracle_cards' | 'unique_artwork' | 'default_cards' | 'all_cards' | 'rulings'
	): Promise<ScryfallBulkData> {
		return this.request<ScryfallBulkData>(`/bulk-data/${type}`);
	}

	/**
	 * Update rate limit configuration
	 */
	updateRateLimit(delayMs: number): void {
		this.rateLimiter.updateConfig({ minDelayMs: delayMs });
	}

	/**
	 * Get current queue size
	 */
	getQueueSize(): number {
		return this.rateLimiter.getQueueSize();
	}
}

// Export singleton instance
export const scryfallClient = new ScryfallClient();
