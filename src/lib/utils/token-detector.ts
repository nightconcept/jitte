/**
 * Token detection utility for extracting tokens from deck cards
 */

import type { Card } from '$lib/types/card';
import type { ScryfallCard, ScryfallRelatedCard } from '$lib/types/scryfall';
import { ScryfallClient } from '$lib/api/scryfall-client';
import { scryfallToCard } from './card-converter';

/**
 * Information about a token and the cards that create it
 */
export interface TokenInfo {
	/** The token card data */
	token: Card;
	/** Names of cards that create this token */
	createdBy: string[];
	/** Suggested quantity (based on number of cards that create it) */
	suggestedQuantity: number;
}

/**
 * Cache for token detection results
 * Maps deck hash -> token info array
 */
const tokenCache = new Map<string, TokenInfo[]>();

/**
 * Cache for Scryfall card data (to avoid re-fetching all_parts)
 * Maps scryfallId -> ScryfallCard
 */
const scryfallCardCache = new Map<string, ScryfallCard>();

/**
 * Generate a hash for a deck's cards to enable caching
 */
function getDeckHash(cards: Card[]): string {
	return cards
		.map((c) => `${c.scryfallId}:${c.quantity}`)
		.sort()
		.join('|');
}

/**
 * Fetch a Scryfall card with caching
 */
async function fetchScryfallCard(
	scryfallId: string,
	client: ScryfallClient
): Promise<ScryfallCard | null> {
	// Check cache first
	if (scryfallCardCache.has(scryfallId)) {
		return scryfallCardCache.get(scryfallId)!;
	}

	try {
		const scryfallCard = await client.getCard(scryfallId);
		scryfallCardCache.set(scryfallId, scryfallCard);
		return scryfallCard;
	} catch (error) {
		console.warn(`Failed to fetch Scryfall card ${scryfallId}:`, error);
		return null;
	}
}

/**
 * Check if a related card is a token
 */
function isTokenRelatedCard(relatedCard: ScryfallRelatedCard): boolean {
	return relatedCard.component === 'token';
}

/**
 * Extract tokens from a single card's all_parts
 */
async function extractTokensFromCard(
	card: Card,
	client: ScryfallClient
): Promise<Array<{ tokenId: string; createdBy: string }>> {
	if (!card.scryfallId) {
		return [];
	}

	// Fetch the full Scryfall card data to get all_parts
	const scryfallCard = await fetchScryfallCard(card.scryfallId, client);
	if (!scryfallCard || !scryfallCard.all_parts) {
		return [];
	}

	// Filter for token components
	const tokens = scryfallCard.all_parts.filter(isTokenRelatedCard);

	return tokens.map((token) => ({
		tokenId: token.id,
		createdBy: card.name
	}));
}

/**
 * Detect all tokens created by cards in a deck
 * Results are cached based on deck composition
 */
export async function detectTokensInDeck(
	cards: Card[],
	client?: ScryfallClient
): Promise<TokenInfo[]> {
	// Use default client if none provided
	const scryfallClient = client || new ScryfallClient();

	// Check cache
	const hash = getDeckHash(cards);
	if (tokenCache.has(hash)) {
		return tokenCache.get(hash)!;
	}

	// Extract tokens from all cards
	const tokenPromises = cards.map((card) => extractTokensFromCard(card, scryfallClient));
	const tokenResults = await Promise.all(tokenPromises);

	// Flatten and group by token ID
	const tokenMap = new Map<string, Set<string>>();

	for (const tokens of tokenResults) {
		for (const { tokenId, createdBy } of tokens) {
			if (!tokenMap.has(tokenId)) {
				tokenMap.set(tokenId, new Set());
			}
			tokenMap.get(tokenId)!.add(createdBy);
		}
	}

	// Fetch full token card data
	const tokenInfoPromises = Array.from(tokenMap.entries()).map(
		async ([tokenId, createdBySet]) => {
			const scryfallToken = await fetchScryfallCard(tokenId, scryfallClient);
			if (!scryfallToken) {
				return null;
			}

			const token = scryfallToCard(scryfallToken, 1);
			const createdBy = Array.from(createdBySet).sort();

			// Suggest quantity based on number of cards that create it
			// Default to createdBy.length * 3 (assuming each card might create ~3 tokens)
			const suggestedQuantity = Math.max(createdBy.length * 3, 1);

			return {
				token,
				createdBy,
				suggestedQuantity
			};
		}
	);

	const results = await Promise.all(tokenInfoPromises);
	const tokenInfos = results.filter((info): info is TokenInfo => info !== null);

	// Sort by token name for consistent display
	tokenInfos.sort((a, b) => a.token.name.localeCompare(b.token.name));

	// Cache the result
	tokenCache.set(hash, tokenInfos);

	return tokenInfos;
}

/**
 * Detect tokens for a specific set of cards (e.g., for buylist)
 * Does not use caching since this is typically for one-time operations
 */
export async function detectTokensInCards(
	cards: Card[],
	client?: ScryfallClient
): Promise<TokenInfo[]> {
	// Reuse the main detection function
	return detectTokensInDeck(cards, client);
}

/**
 * Clear the token detection cache
 * Call this when you want to force a refresh
 */
export function clearTokenCache(): void {
	tokenCache.clear();
}

/**
 * Clear the Scryfall card cache
 * Call this when you want to refresh card data
 */
export function clearScryfallCache(): void {
	scryfallCardCache.clear();
}
