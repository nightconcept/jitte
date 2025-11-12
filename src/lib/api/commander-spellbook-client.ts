/**
 * Commander Spellbook API Client
 * https://commanderspellbook.com/
 * API Documentation: https://backend.commanderspellbook.com/
 */

import { RateLimiter } from './rate-limiter';

const BASE_URL = 'https://backend.commanderspellbook.com';
const RATE_LIMIT_MS = 100; // 100ms between requests (conservative)

export interface SpellbookCard {
	id: number;
	name: string;
	oracleId: string;
	typeLine: string;
	spoiler: boolean;
}

export interface SpellbookCardUse {
	card: SpellbookCard;
	quantity: number;
	zoneLocations: string[]; // e.g., ["B"] for battlefield, ["H"] for hand
	mustBeCommander: boolean;
	battlefieldCardState?: string;
	exileCardState?: string;
	graveyardCardState?: string;
	libraryCardState?: string;
}

export interface SpellbookTemplate {
	id: number;
	name: string;
	scryfallQuery: string;
	scryfallApi: string;
}

export interface SpellbookRequirement {
	quantity: number;
	template?: SpellbookTemplate;
	card?: SpellbookCard;
	zoneLocations: string[];
	mustBeCommander: boolean;
}

export interface SpellbookFeature {
	id: number;
	name: string;
	status: string;
	uncountable: boolean;
}

export interface SpellbookFeatureProduction {
	feature: SpellbookFeature;
	quantity: number;
}

export interface ComboVariant {
	id: string;
	identity: string; // Color identity, e.g., "UB", "WUBRG", "C"
	uses: SpellbookCardUse[]; // Cards required for the combo
	requires: SpellbookRequirement[]; // Additional requirements (templates, etc.)
	produces: SpellbookFeatureProduction[]; // Results (infinite mana, win, etc.)
	status: string; // "OK", etc.
	spoiler: boolean;
	notes: string;
	description?: string; // How to execute the combo
	manaNeeded?: string;
	manaValueNeeded?: number;
	popularity?: number; // EDHREC deck count
	prices?: {
		tcgplayer?: string;
		cardmarket?: string;
		cardkingdom?: string;
	};
	bracketTag?: string; // Bracket classification
	legalities?: Record<string, boolean>;
}

export interface VariantsResponse {
	count: number;
	next: string | null;
	previous: string | null;
	results: ComboVariant[];
}

export interface FindMyCombosRequest {
	commanders?: Array<{ card: string }>;
	cards: string[];
}

export interface FindMyCombosResponse {
	count: number;
	next: string | null;
	previous: string | null;
	results: {
		identity: string;
		included: ComboVariant[]; // Combos where all pieces are in the deck
		includedByChangingCommanders: ComboVariant[];
		almostIncluded: ComboVariant[]; // Combos missing 1-2 cards
		almostIncludedByAddingColors: ComboVariant[];
		almostIncludedByChangingCommanders: ComboVariant[];
		almostIncludedByAddingColorsAndChangingCommanders: ComboVariant[];
	};
}

/**
 * Commander Spellbook API Client
 */
export class CommanderSpellbookClient {
	private rateLimiter: RateLimiter;

	constructor(rateLimitMs: number = RATE_LIMIT_MS) {
		this.rateLimiter = new RateLimiter({ minDelayMs: rateLimitMs });
	}

	/**
	 * Search for combo variants using query syntax
	 *
	 * Query syntax:
	 * - card:"Card Name" - Search for combos using a specific card
	 * - identity:UB - Search by color identity
	 * - result:"Infinite mana" - Search by result
	 * - cards>2 - Number of cards in combo
	 * - popularity>1000 - EDHREC popularity
	 *
	 * @example
	 * // Find combos with Thassa's Oracle and Demonic Consultation
	 * searchVariants('card:"Thassa\'s Oracle" card:"Demonic Consultation"')
	 */
	async searchVariants(query: string, limit: number = 100): Promise<VariantsResponse> {
		return this.rateLimiter.execute(async () => {
			const params = new URLSearchParams({
				q: query,
				limit: limit.toString()
			});

			const response = await fetch(`${BASE_URL}/variants?${params}`);

			if (!response.ok) {
				throw new Error(`Commander Spellbook API error: ${response.status} ${response.statusText}`);
			}

			return response.json();
		});
	}

	/**
	 * Get a specific variant by ID
	 */
	async getVariantById(id: string): Promise<ComboVariant | null> {
		return this.rateLimiter.execute(async () => {
			const response = await fetch(`${BASE_URL}/variants/${id}/`);

			if (response.status === 404) {
				return null;
			}

			if (!response.ok) {
				throw new Error(`Commander Spellbook API error: ${response.status} ${response.statusText}`);
			}

			return response.json();
		});
	}

	/**
	 * Find combos in a decklist
	 *
	 * Note: This endpoint may have limitations. For better results, consider using
	 * searchVariants() with card filters and manually checking if all combo pieces
	 * are present in the deck.
	 */
	async findMyCombos(request: FindMyCombosRequest): Promise<FindMyCombosResponse> {
		return this.rateLimiter.execute(async () => {
			const response = await fetch(`${BASE_URL}/find-my-combos/`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(request)
			});

			if (!response.ok) {
				const errorText = await response.text();
				throw new Error(
					`Commander Spellbook API error: ${response.status} ${response.statusText}\n${errorText}`
				);
			}

			return response.json();
		});
	}

	/**
	 * Search for combos that use specific cards from a deck
	 *
	 * This works by:
	 * 1. Searching for combos with each card in the deck (multiple API calls)
	 * 2. Deduplicating results
	 * 3. Filtering to combos where ALL required cards are in the deck
	 *
	 * @param cardNames - Array of card names in the deck
	 * @param maxResults - Maximum number of combos to return (default: 50)
	 */
	async findCombosInDeck(cardNames: string[], maxResults: number = 50): Promise<ComboVariant[]> {
		console.log('[COMBO API DEBUG] findCombosInDeck called with', cardNames.length, 'cards');

		if (cardNames.length === 0) {
			return [];
		}

		// Create a Set for O(1) lookup
		const cardSet = new Set(cardNames.map((name) => name.toLowerCase().trim()));
		console.log('[COMBO API DEBUG] Card set created with', cardSet.size, 'unique cards');
		console.log('[COMBO API DEBUG] Sample cards in set:', Array.from(cardSet).slice(0, 5));

		// Track unique combos by ID
		const comboMap = new Map<string, ComboVariant>();

		// Search for combos using each card (skip basic lands to avoid noise)
		const basicLands = new Set(['Plains', 'Island', 'Swamp', 'Mountain', 'Forest', 'Wastes']);
		const searchableCards = cardNames.filter((name) => !basicLands.has(name));

		// Search ALL non-basic cards
		// With 100ms rate limiting, a 100-card deck takes ~10 seconds on first load
		// But results are cached for 7 days, so subsequent loads are instant
		const cardsToSearch = searchableCards;
		console.log('[COMBO API DEBUG] Searching', cardsToSearch.length, 'non-basic cards');

		let searchCount = 0;
		for (const cardName of cardsToSearch) {
			try {
				const query = `card:"${cardName}"`;
				const response = await this.searchVariants(query, 50);
				searchCount++;

				if (response.results.length > 0) {
					console.log(`[COMBO API DEBUG] Card "${cardName}" found ${response.results.length} combos`);
				}

				// Add combos to map (deduplicates automatically)
				for (const variant of response.results) {
					if (!comboMap.has(variant.id)) {
						comboMap.set(variant.id, variant);
					}
				}
			} catch (error) {
				console.error(`[COMBO API DEBUG] Error searching for combos with ${cardName}:`, error);
				// Continue with other cards
			}
		}

		console.log(`[COMBO API DEBUG] Searched ${searchCount} cards, found ${comboMap.size} unique combos`);

		// Filter to combos where ALL required cards are in the deck
		const allCombos = Array.from(comboMap.values());
		console.log('[COMBO API DEBUG] Filtering combos...');

		const completeCombos = allCombos.filter((variant) => {
			// Check if all required cards are present in the deck
			const requiredCards = variant.uses
				.filter((use) => !use.mustBeCommander) // Exclude commander-specific requirements
				.map((use) => use.card.name.toLowerCase().trim());

			// Check if all required cards are in the deck
			const allCardsPresent = requiredCards.every((cardName) => cardSet.has(cardName));

			// Also check if there are any template requirements (wildcards)
			// If there are templates, we can't easily verify, so we exclude those combos
			const hasTemplateRequirements = variant.requires.some((req) => req.template !== undefined);

			const passes = allCardsPresent && !hasTemplateRequirements;

			if (!passes && variant.uses.some(u => u.card.name.toLowerCase().includes('kenrith'))) {
				console.log('[COMBO API DEBUG] Kenrith combo filtered out:', {
					id: variant.id,
					requiredCards,
					allCardsPresent,
					hasTemplateRequirements,
					cardSetHas: requiredCards.map(rc => ({ card: rc, inDeck: cardSet.has(rc) }))
				});
			}

			// Special debug for the specific combo we're looking for
			if (variant.id === '1872-5140') {
				console.log('[COMBO API DEBUG] ⭐ Found the Kenrith + Composite Golem combo!', {
					id: variant.id,
					requiredCards,
					allCardsPresent,
					hasTemplateRequirements,
					cardSetHas: requiredCards.map(rc => ({
						card: rc,
						inDeck: cardSet.has(rc),
						similarInDeck: Array.from(cardSet).filter(c => c.includes('kenrith') || c.includes('composite'))
					})),
					passes
				});
			}

			return passes;
		});

		console.log('[COMBO API DEBUG] After filtering:', completeCombos.length, 'complete combos');

		return completeCombos.slice(0, maxResults);
	}

	/**
	 * Check if a combo is a 2-card infinite combo
	 *
	 * A combo is considered "2-card infinite" if:
	 * - It uses exactly 2 cards (not templates)
	 * - It produces an "infinite" result
	 * - It doesn't require complex prerequisites
	 */
	isTwoCardInfiniteCombo(variant: ComboVariant): boolean {
		// Check if it uses exactly 2 cards (no templates)
		const cardCount = variant.uses.filter((use) => !use.mustBeCommander).length;
		const hasTemplates = variant.requires.some((req) => req.template !== undefined);

		if (cardCount !== 2 || hasTemplates) {
			return false;
		}

		// Check if any result is "infinite"
		const hasInfiniteResult = variant.produces.some((prod) =>
			prod.feature.name.toLowerCase().includes('infinite')
		);

		return hasInfiniteResult;
	}

	/**
	 * Categorize combo speed based on mana requirements and results
	 *
	 * - early: Low CMC (≤4), fast to execute
	 * - mid: Medium CMC (5-7), moderate setup
	 * - late: High CMC (8+), slow/expensive
	 */
	categorizeComboSpeed(variant: ComboVariant): 'early' | 'mid' | 'late' {
		const totalCmc = variant.uses.reduce((sum, use) => {
			// Estimate CMC from card type if not available
			// This is a rough heuristic
			return sum + (use.card.typeLine.includes('Land') ? 0 : 3);
		}, 0);

		if (totalCmc <= 4) return 'early';
		if (totalCmc <= 7) return 'mid';
		return 'late';
	}
}

// Singleton instance
let clientInstance: CommanderSpellbookClient | null = null;

/**
 * Get the shared Commander Spellbook API client instance
 */
export function getCommanderSpellbookClient(): CommanderSpellbookClient {
	if (!clientInstance) {
		clientInstance = new CommanderSpellbookClient();
	}
	return clientInstance;
}
