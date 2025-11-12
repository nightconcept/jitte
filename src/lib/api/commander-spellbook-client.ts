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
		if (cardNames.length === 0) {
			return [];
		}

		// Create a Set for O(1) lookup
		const cardSet = new Set(cardNames.map((name) => name.toLowerCase().trim()));

		// Track unique combos by ID
		const comboMap = new Map<string, ComboVariant>();

		// Search for combos using each card (skip basic lands to avoid noise)
		const basicLands = new Set(['Plains', 'Island', 'Swamp', 'Mountain', 'Forest', 'Wastes']);
		const searchableCards = cardNames.filter((name) => !basicLands.has(name));

		// Search all non-basic cards
		const cardsToSearch = searchableCards;

		for (const cardName of cardsToSearch) {
			try {
				const query = `card:"${cardName}"`;
				const response = await this.searchVariants(query, 50);

				// Add combos to map (deduplicates automatically)
				for (const variant of response.results) {
					if (!comboMap.has(variant.id)) {
						comboMap.set(variant.id, variant);
					}
				}
			} catch (error) {
				console.error(`Error searching for combos with ${cardName}:`, error);
				// Continue with other cards
			}
		}

		// Filter to combos where ALL required cards are in the deck
		const allCombos = Array.from(comboMap.values());

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

			return allCardsPresent && !hasTemplateRequirements;
		});

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
	 * Categorize combo speed based on mana requirements
	 *
	 * For bracket purposes:
	 * - early: Can win before turn 6-7 (total mana ≤6), pushes to Bracket 4
	 * - mid: Wins turn 7-10 (total mana 7-9)
	 * - late: Wins turn 10+ (total mana ≥10), Bracket 3 acceptable
	 *
	 * Uses manaValueNeeded if available, otherwise estimates from card types
	 */
	categorizeComboSpeed(variant: ComboVariant): 'early' | 'mid' | 'late' {
		let totalMana: number;

		// Use manaValueNeeded if available (most accurate)
		if (variant.manaValueNeeded !== undefined && variant.manaValueNeeded > 0) {
			totalMana = variant.manaValueNeeded;
		} else {
			// Estimate from card CMC (rough heuristic)
			totalMana = variant.uses.reduce((sum, use) => {
				if (use.card.typeLine.includes('Land')) return sum;
				// Estimate 3 CMC for unknown cards
				return sum + 3;
			}, 0);
		}

		// Bracket-relevant thresholds
		// Early: Can execute turns 4-6 → Bracket 4
		// Late: Executes turn 7+ → Bracket 3
		if (totalMana <= 6) return 'early';
		if (totalMana <= 9) return 'mid';
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
