/**
 * Pricing Enrichment Utility
 *
 * This module provides automatic pricing enrichment for Scryfall cards.
 * When a specific card edition doesn't have pricing data, this utility
 * fetches all printings of the card and uses pricing from the most
 * recent printing that has pricing available.
 *
 * IMPORTANT: This module should ONLY be used by cardService.
 * Components should never call these functions directly.
 */

import type { ScryfallCard } from '$lib/types/scryfall';
import { scryfallClient } from '$lib/api/scryfall-client';

/**
 * Cache for fallback pricing lookups (oracle_id -> pricing data)
 * Stores the most recent printing's USD price for each oracle_id
 */
const fallbackPricingCache = new Map<string, string | null>();

/**
 * Cache of oracle_ids currently being fetched to avoid duplicate requests
 */
const inFlightRequests = new Map<string, Promise<string | null>>();

/**
 * Get fallback pricing for a card by oracle_id
 * Fetches all printings and returns pricing from the most recent printing with data
 *
 * @param oracleId - The oracle_id of the card
 * @returns USD price string from the most recent printing, or null if no printings have pricing
 */
async function getFallbackPricingForOracleId(oracleId: string): Promise<string | null> {
	// Check cache first
	if (fallbackPricingCache.has(oracleId)) {
		return fallbackPricingCache.get(oracleId) || null;
	}

	// Check if already fetching this oracle_id
	const inFlight = inFlightRequests.get(oracleId);
	if (inFlight) {
		return inFlight;
	}

	// Create new fetch promise
	const fetchPromise = (async () => {
		try {
			// Fetch all printings (uses Scryfall queue with 'printing' request type)
			const printingsResponse = await scryfallClient.getCardPrintings(oracleId);
			const printings = printingsResponse.data;

			// Filter to printings with pricing and sort by release date (newest first)
			const printingsWithPricing = printings
				.filter((p) => p.prices.usd !== null)
				.sort((a, b) => new Date(b.released_at).getTime() - new Date(a.released_at).getTime());

			// Get pricing from most recent printing
			const price = printingsWithPricing.length > 0 ? printingsWithPricing[0].prices.usd : null;

			// Cache the result (even if null, to avoid refetching)
			fallbackPricingCache.set(oracleId, price);

			return price;
		} catch (error) {
			console.error(
				`[pricing-enrichment] Error fetching fallback pricing for oracle_id ${oracleId}:`,
				error
			);
			// Cache null result to avoid retry storms
			fallbackPricingCache.set(oracleId, null);
			return null;
		} finally {
			// Remove from in-flight tracking
			inFlightRequests.delete(oracleId);
		}
	})();

	// Track in-flight request
	inFlightRequests.set(oracleId, fetchPromise);

	return fetchPromise;
}

/**
 * Enrich a single Scryfall card with fallback pricing if needed
 * This mutates the card object to add pricing data.
 *
 * @param card - The Scryfall card to enrich
 * @returns The same card object (mutated) with enriched pricing
 */
export async function enrichScryfallCardPricing(card: ScryfallCard): Promise<ScryfallCard> {
	// If card already has pricing or no oracle_id, return as-is
	if (card.prices.usd || !card.oracle_id) {
		return card;
	}

	console.log(
		`[pricing-enrichment] No pricing for ${card.name} (${card.set} #${card.collector_number}), fetching fallback...`
	);

	const fallbackPrice = await getFallbackPricingForOracleId(card.oracle_id);

	if (fallbackPrice) {
		// Mutate the card's prices object
		card.prices = {
			...card.prices,
			usd: fallbackPrice
		};
		console.log(`[pricing-enrichment] Applied fallback pricing: $${fallbackPrice}`);
	} else {
		console.log(`[pricing-enrichment] No pricing available for any printing of ${card.name}`);
	}

	return card;
}

/**
 * Enrich multiple Scryfall cards with fallback pricing
 * More efficient than individual enrichments when loading decks
 *
 * @param cards - Array of Scryfall cards to enrich
 * @returns The same array (cards are mutated) with enriched pricing
 */
export async function enrichScryfallCardsPricing(cards: ScryfallCard[]): Promise<ScryfallCard[]> {
	// Identify cards needing fallback pricing
	const needsFallback: { card: ScryfallCard; oracleId: string }[] = [];

	for (const card of cards) {
		if (!card.prices.usd && card.oracle_id) {
			needsFallback.push({ card, oracleId: card.oracle_id });
		}
	}

	if (needsFallback.length === 0) {
		return cards;
	}

	console.log(`[pricing-enrichment] Enriching ${needsFallback.length} cards with fallback pricing...`);

	// Fetch all fallback pricing in parallel (requests go through queue automatically)
	const fallbackPromises = needsFallback.map(({ oracleId }) =>
		getFallbackPricingForOracleId(oracleId)
	);

	const fallbackResults = await Promise.all(fallbackPromises);

	// Apply results to cards (mutation)
	for (let i = 0; i < needsFallback.length; i++) {
		const { card } = needsFallback[i];
		const fallbackPrice = fallbackResults[i];

		if (fallbackPrice) {
			card.prices = {
				...card.prices,
				usd: fallbackPrice
			};
		}
	}

	console.log(`[pricing-enrichment] Enriched ${needsFallback.length} cards`);

	return cards;
}

/**
 * Clear the fallback pricing cache
 * Useful for testing or when you want fresh pricing data
 */
export function clearPricingCache(): void {
	fallbackPricingCache.clear();
	inFlightRequests.clear();
}

/**
 * Get cache statistics for debugging
 */
export function getPricingCacheStats(): {
	cacheSize: number;
	inFlightCount: number;
} {
	return {
		cacheSize: fallbackPricingCache.size,
		inFlightCount: inFlightRequests.size
	};
}
