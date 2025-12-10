/**
 * Card Hydration Utilities
 *
 * Handles fetching full card data from Scryfall for slim CardReferences.
 * Uses IndexedDB cache (jitte-card-cache) and batch API requests.
 */

import type { ScryfallCard } from '$lib/types/scryfall';
import type { CardReferencesByCategory, CardReference } from '$lib/types/card-reference';
import type { CardsByCategory } from '$lib/types/card';
import { cardCache } from '$lib/api/cache';
import { cardService } from '$lib/api/card-service';
import { extractScryfallIds, referencesToCards } from './card-reference';

/**
 * Progress callback for hydration operations
 */
export type HydrationProgressCallback = (progress: HydrationProgress) => void;

/**
 * Hydration progress information
 */
export interface HydrationProgress {
	/** Current phase */
	phase: 'checking_cache' | 'fetching' | 'hydrating' | 'complete';

	/** Progress percentage (0-100) */
	percentage: number;

	/** Human-readable status message */
	message: string;

	/** Number of cards found in cache */
	cachedCount?: number;

	/** Number of cards that need fetching */
	fetchCount?: number;

	/** Number of cards hydrated so far */
	hydratedCount?: number;

	/** Total cards to hydrate */
	totalCount?: number;
}

/**
 * Result of a hydration operation
 */
export interface HydrationResult {
	/** Hydrated cards organized by category */
	cards: CardsByCategory;

	/** Cards that couldn't be hydrated (missing from Scryfall) */
	errors: Array<{
		ref: CardReference;
		error: string;
	}>;

	/** Statistics about the hydration */
	stats: {
		/** Total cards processed */
		totalCount: number;

		/** Cards found in cache */
		cachedCount: number;

		/** Cards fetched from API */
		fetchedCount: number;

		/** Cards that failed hydration */
		errorCount: number;

		/** Time taken in milliseconds */
		durationMs: number;
	};
}

/**
 * Hydrate card references with full Scryfall data
 *
 * Process:
 * 1. Extract unique scryfall IDs
 * 2. Check IndexedDB cache for each ID
 * 3. Batch fetch missing cards from Scryfall API
 * 4. Convert references to full Card objects
 *
 * @param refs - Card references to hydrate
 * @param fallbackNames - Map of scryfallId -> card name for placeholders
 * @param onProgress - Optional progress callback
 */
export async function hydrateCardReferences(
	refs: CardReferencesByCategory,
	fallbackNames?: Map<string, string>,
	onProgress?: HydrationProgressCallback
): Promise<HydrationResult> {
	const startTime = Date.now();

	// Extract all unique scryfall IDs
	const allIds = extractScryfallIds(refs);
	const totalCount = allIds.length;

	onProgress?.({
		phase: 'checking_cache',
		percentage: 0,
		message: `Checking cache for ${totalCount} cards...`,
		totalCount
	});

	// Check cache for each ID
	const scryfallCache = new Map<string, ScryfallCard>();
	const missingIds: string[] = [];

	for (let i = 0; i < allIds.length; i++) {
		const id = allIds[i];
		const cached = await cardCache.getCard(id);

		if (cached) {
			scryfallCache.set(id, cached);
		} else {
			missingIds.push(id);
		}

		// Update progress every 10 cards
		if (i % 10 === 0 || i === allIds.length - 1) {
			onProgress?.({
				phase: 'checking_cache',
				percentage: Math.round(((i + 1) / allIds.length) * 30), // 0-30%
				message: `Checking cache: ${i + 1}/${allIds.length}`,
				cachedCount: scryfallCache.size,
				fetchCount: missingIds.length,
				totalCount
			});
		}
	}

	const cachedCount = scryfallCache.size;
	let fetchedCount = 0;

	// Fetch missing cards from Scryfall
	if (missingIds.length > 0) {
		onProgress?.({
			phase: 'fetching',
			percentage: 30,
			message: `Fetching ${missingIds.length} cards from Scryfall...`,
			cachedCount,
			fetchCount: missingIds.length,
			totalCount
		});

		// Batch fetch by ID (max 75 per request)
		const batches: string[][] = [];
		for (let i = 0; i < missingIds.length; i += 75) {
			batches.push(missingIds.slice(i, i + 75));
		}

		for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
			const batch = batches[batchIndex];

			try {
				// Fetch batch from Scryfall
				const fetchedCards = await fetchCardsByIds(batch);

				// Add to cache map and IndexedDB
				for (const card of fetchedCards) {
					scryfallCache.set(card.id, card);
					await cardCache.cacheCard(card);
					fetchedCount++;
				}
			} catch (error) {
				console.error(`[Hydration] Batch ${batchIndex + 1} failed:`, error);
				// Continue with other batches
			}

			// Update progress
			const progressPct = 30 + Math.round(((batchIndex + 1) / batches.length) * 50); // 30-80%
			onProgress?.({
				phase: 'fetching',
				percentage: progressPct,
				message: `Fetching batch ${batchIndex + 1}/${batches.length}...`,
				cachedCount,
				fetchCount: missingIds.length,
				hydratedCount: fetchedCount,
				totalCount
			});
		}
	}

	// Convert references to full cards
	onProgress?.({
		phase: 'hydrating',
		percentage: 80,
		message: 'Converting to card objects...',
		cachedCount,
		fetchCount: missingIds.length,
		hydratedCount: fetchedCount,
		totalCount
	});

	const { cards, errors } = referencesToCards(refs, scryfallCache, fallbackNames);

	// Complete
	const durationMs = Date.now() - startTime;

	onProgress?.({
		phase: 'complete',
		percentage: 100,
		message: `Hydrated ${totalCount - errors.length} cards in ${durationMs}ms`,
		cachedCount,
		fetchCount: missingIds.length,
		hydratedCount: totalCount - errors.length,
		totalCount
	});

	return {
		cards,
		errors,
		stats: {
			totalCount,
			cachedCount,
			fetchedCount,
			errorCount: errors.length,
			durationMs
		}
	};
}

/**
 * Fetch cards by scryfall ID using the collection endpoint
 * @param ids - Array of scryfall IDs to fetch
 * @returns Array of ScryfallCard objects
 */
async function fetchCardsByIds(ids: string[]): Promise<ScryfallCard[]> {
	if (ids.length === 0) return [];
	if (ids.length > 75) {
		throw new Error('Maximum 75 IDs per batch');
	}

	// Use the existing card service infrastructure
	// The collection endpoint accepts { id: string } identifiers
	const { scryfallClient } = await import('$lib/api/scryfall-client');
	const { enrichScryfallCardsPricing } = await import('$lib/utils/pricing-enrichment');

	const identifiers = ids.map((id) => ({ id }));
	const result = await scryfallClient.getCardCollection(identifiers, 'hydration');

	// Enrich pricing for all fetched cards
	await enrichScryfallCardsPricing(result.data);

	return result.data;
}

/**
 * Pre-warm the cache with cards from a deck
 * Useful when importing or migrating decks
 *
 * @param cards - Full card objects to cache
 */
export async function prewarmCache(cards: CardsByCategory): Promise<void> {
	const { scryfallClient } = await import('$lib/api/scryfall-client');

	// Extract unique cards by scryfallId
	const uniqueCards = new Map<string, { name: string; setCode?: string; collectorNumber?: string }>();

	for (const categoryCards of Object.values(cards)) {
		for (const card of categoryCards) {
			if (card.scryfallId && !uniqueCards.has(card.scryfallId)) {
				uniqueCards.set(card.scryfallId, {
					name: card.name,
					setCode: card.setCode,
					collectorNumber: card.collectorNumber
				});
			}
		}
	}

	// Check which are already cached
	const toFetch: string[] = [];
	for (const id of uniqueCards.keys()) {
		const cached = await cardCache.getCard(id);
		if (!cached) {
			toFetch.push(id);
		}
	}

	if (toFetch.length === 0) {
		console.log('[Hydration] All cards already cached');
		return;
	}

	console.log(`[Hydration] Pre-warming cache with ${toFetch.length} cards`);

	// Batch fetch and cache
	const batches: string[][] = [];
	for (let i = 0; i < toFetch.length; i += 75) {
		batches.push(toFetch.slice(i, i + 75));
	}

	for (const batch of batches) {
		try {
			const fetchedCards = await fetchCardsByIds(batch);
			for (const card of fetchedCards) {
				await cardCache.cacheCard(card);
			}
		} catch (error) {
			console.error('[Hydration] Prewarm batch failed:', error);
		}
	}
}

/**
 * Check if all cards in references are cached
 */
export async function areAllCardsCached(refs: CardReferencesByCategory): Promise<boolean> {
	const ids = extractScryfallIds(refs);

	for (const id of ids) {
		const cached = await cardCache.getCard(id);
		if (!cached) {
			return false;
		}
	}

	return true;
}

/**
 * Get cache status for card references
 */
export async function getCacheStatus(refs: CardReferencesByCategory): Promise<{
	total: number;
	cached: number;
	missing: number;
	missingIds: string[];
}> {
	const ids = extractScryfallIds(refs);
	const missingIds: string[] = [];

	for (const id of ids) {
		const cached = await cardCache.getCard(id);
		if (!cached) {
			missingIds.push(id);
		}
	}

	return {
		total: ids.length,
		cached: ids.length - missingIds.length,
		missing: missingIds.length,
		missingIds
	};
}
