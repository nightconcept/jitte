/**
 * EDHREC Service
 *
 * High-level API for accessing EDHREC data with caching and error handling.
 * This is the main interface that components should use.
 *
 * Features:
 * - Automatic caching with configurable TTLs
 * - Rate limiting (30 requests/minute)
 * - Graceful error handling
 * - Commander recommendations
 * - Salt score lookups
 *
 * Usage:
 *   import { edhrecService } from '$lib/api/edhrec-service';
 *   const recs = await edhrecService.getHighSynergyCards('Atraxa, Praetors Voice');
 *   const salt = await edhrecService.getSaltScore('Cyclonic Rift');
 */

import { EDHRECClient } from './edhrec-client';
import { EDHRECParser } from './edhrec-parser';
import { EDHRECCache } from './edhrec-cache';
import type {
	EDHRECCommanderData,
	EDHRECSaltScore,
	EDHRECCardRecommendation
} from '$lib/types/edhrec';
import { EDHRECError } from '$lib/types/edhrec';
import { getSaltScore as getLocalSaltScore, SALT_SCORES_COUNT } from '$lib/data/salt-scores';

export class EDHRECService {
	private client: EDHRECClient;
	private parser: EDHRECParser;
	private cache: EDHRECCache;

	// Cache TTLs (aggressive caching for salt scores)
	private readonly COMMANDER_TTL = 24 * 60 * 60 * 1000; // 24 hours
	private readonly SALT_TTL = 30 * 24 * 60 * 60 * 1000; // 30 days (aggressive)
	private readonly SALT_LIST_TTL = 30 * 24 * 60 * 60 * 1000; // 30 days (aggressive)
	private readonly SALT_API_FALLBACK_TTL = 90 * 24 * 60 * 60 * 1000; // 90 days (very aggressive for API-fetched rare cards)

	constructor() {
		this.client = new EDHRECClient({
			minDelayMs: 2000, // 30 requests per minute
			useCorsProxy: true // Enable CORS proxy for browser-based requests
		});
		this.parser = new EDHRECParser();
		this.cache = new EDHRECCache();
	}

	/**
	 * Get all recommendation data for a commander
	 */
	async getCommanderRecommendations(commander: string): Promise<EDHRECCommanderData> {
		const cacheKey = `commander:${commander.toLowerCase()}`;
		const cached = this.cache.get<EDHRECCommanderData>(cacheKey);

		if (cached) {
			console.log(`[EDHREC] Cache hit for commander: ${commander}`);
			return cached;
		}

		console.log(`[EDHREC] Fetching commander data for: ${commander}`);

		try {
			const html = await this.client.fetchCommanderPage(commander);
			const data = this.parser.parseCommanderData(html);

			this.cache.set(cacheKey, data, this.COMMANDER_TTL);
			return data;
		} catch (error) {
			if (error instanceof EDHRECError) {
				throw error;
			}
			throw new EDHRECError(
				`Failed to fetch commander recommendations for ${commander}`,
				undefined,
				error instanceof Error ? error : undefined
			);
		}
	}

	/**
	 * Get high synergy cards for a commander
	 */
	async getHighSynergyCards(
		commander: string,
		limit = 10
	): Promise<EDHRECCardRecommendation[]> {
		const data = await this.getCommanderRecommendations(commander);
		const highSynergy = data.cardlists.find((list) => list.header === 'High Synergy Cards');

		return highSynergy?.cards.slice(0, limit) || [];
	}

	/**
	 * Get new/recently popular cards for a commander
	 */
	async getNewCards(commander: string, limit = 10): Promise<EDHRECCardRecommendation[]> {
		const data = await this.getCommanderRecommendations(commander);
		const newCards = data.cardlists.find((list) => list.header === 'New Cards');

		return newCards?.cards.slice(0, limit) || [];
	}

	/**
	 * Get top cards for a commander by category
	 */
	async getTopCardsByCategory(
		commander: string,
		category: string,
		limit = 10
	): Promise<EDHRECCardRecommendation[]> {
		const data = await this.getCommanderRecommendations(commander);
		const categoryList = data.cardlists.find((list) =>
			list.header.toLowerCase().includes(category.toLowerCase())
		);

		return categoryList?.cards.slice(0, limit) || [];
	}

	/**
	 * Get salt score for a specific card
	 * HYBRID APPROACH:
	 * 1. Check local data first (top 100, instant)
	 * 2. Check cache
	 * 3. Fall back to EDHREC API only if needed
	 * 4. Aggressively cache API results
	 */
	async getSaltScore(cardName: string): Promise<EDHRECSaltScore | null> {
		// 1. Check local data first (instant, no network call)
		const localScore = getLocalSaltScore(cardName);
		if (localScore) {
			console.log(`[EDHREC] Local data hit for salt score: ${cardName} (${localScore.score})`);

			// Convert local format to service format
			const saltScore: EDHRECSaltScore = {
				cardName: localScore.name,
				saltScore: localScore.score,
				deckCount: localScore.deckCount,
				rank: localScore.rank
			};

			// Cache it for consistency (but we'll always check local first anyway)
			const cacheKey = `salt:${cardName.toLowerCase()}`;
			this.cache.set(cacheKey, saltScore, this.SALT_TTL);

			return saltScore;
		}

		// 2. Check cache for API-fetched scores (cards not in local top 100)
		const cacheKey = `salt:${cardName.toLowerCase()}`;
		const cached = this.cache.get<EDHRECSaltScore>(cacheKey);

		if (cached) {
			console.log(`[EDHREC] Cache hit for salt score (API-fetched): ${cardName}`);
			return cached;
		}

		// 3. Card not in local top ${SALT_SCORES_COUNT} - try API as fallback
		console.log(`[EDHREC] Card not in local top ${SALT_SCORES_COUNT}, fetching from API: ${cardName}`);

		try {
			// Try individual card page
			const html = await this.client.fetchCardPage(cardName);
			const saltScore = this.parser.parseCardSaltScore(html);

			if (saltScore) {
				// Aggressively cache API results (90 days) since these are rare cards
				this.cache.set(cacheKey, saltScore, this.SALT_API_FALLBACK_TTL);
				console.log(`[EDHREC] API fallback success: ${cardName} (${saltScore.saltScore})`);
				return saltScore;
			} else {
				// Card has no salt score
				console.log(`[EDHREC] No salt score found for ${cardName}`);
				return null;
			}
		} catch (error) {
			console.warn(`[EDHREC] Error fetching salt score for ${cardName}:`, error);
			return null; // Gracefully fail - salt score is optional data
		}
	}

	/**
	 * Get top saltiest cards list
	 * Now uses local data instead of API (instant, no network call)
	 */
	async getAllSaltScores(): Promise<EDHRECSaltScore[]> {
		console.log(`[EDHREC] Using local salt scores (${SALT_SCORES_COUNT} cards, no API call)`);

		// Use local data - no need to fetch from API anymore
		const { SALT_SCORES } = await import('$lib/data/salt-scores');

		return SALT_SCORES.map((local) => ({
			cardName: local.name,
			saltScore: local.score,
			deckCount: local.deckCount,
			rank: local.rank
		}));
	}

	/**
	 * Get salt scores for multiple cards (batch operation)
	 * HYBRID APPROACH with aggressive local-first strategy:
	 * 1. Check local data for all cards (instant)
	 * 2. Check cache for remaining cards
	 * 3. Only fetch from API for cards not in local top 100 or cache
	 */
	async getSaltScoresForCards(cardNames: string[]): Promise<Map<string, EDHRECSaltScore>> {
		const results = new Map<string, EDHRECSaltScore>();
		const notInLocal: string[] = [];

		console.log(`[EDHREC] Batch lookup for ${cardNames.length} cards`);

		// 1. Check local data first for all cards (instant, no API call)
		for (const name of cardNames) {
			const localScore = getLocalSaltScore(name);

			if (localScore) {
				const saltScore: EDHRECSaltScore = {
					cardName: localScore.name,
					saltScore: localScore.score,
					deckCount: localScore.deckCount,
					rank: localScore.rank
				};

				results.set(name, saltScore);

				// Cache it for consistency
				const cacheKey = `salt:${name.toLowerCase()}`;
				this.cache.set(cacheKey, saltScore, this.SALT_TTL);
			} else {
				notInLocal.push(name);
			}
		}

		console.log(
			`[EDHREC] Local data: ${results.size}/${cardNames.length} cards found (${notInLocal.length} need fallback)`
		);

		if (notInLocal.length === 0) {
			return results; // All cards found in local data!
		}

		// 2. Check cache for cards not in local data
		const notInCache: string[] = [];
		for (const name of notInLocal) {
			const cacheKey = `salt:${name.toLowerCase()}`;
			const cached = this.cache.get<EDHRECSaltScore>(cacheKey);

			if (cached) {
				results.set(name, cached);
			} else {
				notInCache.push(name);
			}
		}

		console.log(
			`[EDHREC] Cache: ${notInLocal.length - notInCache.length} additional cards found`
		);

		if (notInCache.length === 0) {
			return results; // All remaining cards in cache!
		}

		// 3. Only fetch from API for cards not in local or cache
		// Note: We don't fetch these in batch to avoid excessive API calls
		// Users can manually trigger getSaltScore() for specific rare cards if needed
		console.log(
			`[EDHREC] ${notInCache.length} cards not in local top ${SALT_SCORES_COUNT} or cache (skipping API fetch in batch mode)`
		);

		return results;
	}

	/**
	 * Clear all cached EDHREC data
	 */
	clearCache(): void {
		this.cache.clear();
		console.log('[EDHREC] Cache cleared');
	}

	/**
	 * Get cache statistics (for debugging)
	 */
	getCacheStats(): ReturnType<EDHRECCache['getStats']> {
		return this.cache.getStats();
	}

	/**
	 * Get rate limiter status
	 */
	getRateLimiterQueueSize(): number {
		return this.client.getQueueSize();
	}

	/**
	 * Update rate limiting (use to be more conservative)
	 */
	updateRateLimit(minDelayMs: number): void {
		this.client.updateRateLimit(minDelayMs);
		console.log(`[EDHREC] Rate limit updated to ${minDelayMs}ms between requests`);
	}
}

/**
 * Singleton instance for use throughout the app
 */
export const edhrecService = new EDHRECService();
