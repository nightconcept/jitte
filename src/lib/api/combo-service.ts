/**
 * Combo detection service using Commander Spellbook API
 */

import type { Deck } from '$lib/types/deck';
import type { Card } from '$lib/types/card';
import { getCommanderSpellbookClient, type ComboVariant } from './commander-spellbook-client';

export interface DetectedCombo {
	id: string;
	cardNames: string[]; // Names of cards involved
	results: string[]; // What the combo does (e.g., "Infinite mana", "Win the game")
	description?: string; // How to execute the combo
	speed: 'early' | 'mid' | 'late'; // How fast/expensive the combo is
	isInfinite: boolean; // Whether it creates an infinite loop
	isTwoCard: boolean; // Whether it's a 2-card combo
	popularity?: number; // EDHREC popularity
	totalPrice?: number; // Combined price of combo pieces
}

export interface ComboDetectionResult {
	combos: DetectedCombo[];
	twoCardCombos: DetectedCombo[];
	infiniteCombos: DetectedCombo[];
	earlyGameCombos: DetectedCombo[];
	detectionTime: number; // Time taken to detect combos (ms)
	cached: boolean; // Whether results were from cache
	cardsSearched?: number; // Number of cards searched (for progress)
}

/**
 * Convert a ComboVariant to a DetectedCombo
 */
function variantToDetectedCombo(variant: ComboVariant, speed: 'early' | 'mid' | 'late'): DetectedCombo {
	const client = getCommanderSpellbookClient();
	const cardNames = variant.uses.map((use) => use.card.name);
	const results = variant.produces.map((prod) => prod.feature.name);
	const isTwoCard = client.isTwoCardInfiniteCombo(variant);
	const isInfinite = results.some((r) => r.toLowerCase().includes('infinite'));

	// Calculate total price if available
	let totalPrice: number | undefined;
	if (variant.prices) {
		const tcgPrice = variant.prices.tcgplayer ? parseFloat(variant.prices.tcgplayer) : 0;
		const ckPrice = variant.prices.cardkingdom ? parseFloat(variant.prices.cardkingdom) : 0;
		totalPrice = Math.max(tcgPrice, ckPrice);
	}

	return {
		id: variant.id,
		cardNames,
		results,
		description: variant.description,
		speed,
		isInfinite,
		isTwoCard,
		popularity: variant.popularity,
		totalPrice
	};
}

/**
 * Detect combos in a deck using Commander Spellbook API
 *
 * This function:
 * 1. Extracts all unique card names from the deck
 * 2. Queries Commander Spellbook API for combos
 * 3. Filters to combos where all pieces are present
 * 4. Categorizes by type (2-card, infinite, early-game, etc.)
 *
 * @param deck - The deck to analyze
 * @param useCache - Whether to use cached results (default: true)
 */
export async function detectCombos(
	deck: Deck,
	useCache: boolean = true
): Promise<ComboDetectionResult> {
	const startTime = performance.now();

	console.log('[COMBO DEBUG] Starting combo detection for deck:', deck.name);

	// Check cache first
	if (useCache) {
		const cached = getCachedCombos(deck);
		if (cached) {
			console.log('[COMBO DEBUG] Using cached results');
			return {
				...cached,
				cached: true,
				detectionTime: performance.now() - startTime
			};
		}
	}

	// Extract unique card names from deck
	const cardNames = getUniqueCardNames(deck);
	console.log('[COMBO DEBUG] Extracted card names:', {
		total: cardNames.length,
		first10: cardNames.slice(0, 10),
		hasKenrith: cardNames.some(n => n.toLowerCase().includes('kenrith')),
		hasCompositeGolem: cardNames.some(n => n.toLowerCase().includes('composite'))
	});

	// Query Commander Spellbook API
	const client = getCommanderSpellbookClient();
	console.log('[COMBO DEBUG] Calling findCombosInDeck...');
	const variants = await client.findCombosInDeck(cardNames);
	console.log('[COMBO DEBUG] Found variants:', {
		count: variants.length,
		variants: variants.map(v => ({
			id: v.id,
			cards: v.uses.map(u => u.card.name)
		}))
	});

	// Convert variants to DetectedCombos
	const combos: DetectedCombo[] = variants.map((variant) => {
		const speed = client.categorizeComboSpeed(variant);
		return variantToDetectedCombo(variant, speed);
	});

	// Categorize combos
	const twoCardCombos = combos.filter((c) => c.isTwoCard);
	const infiniteCombos = combos.filter((c) => c.isInfinite);
	const earlyGameCombos = combos.filter((c) => c.speed === 'early');

	console.log('[COMBO DEBUG] Final results:', {
		totalCombos: combos.length,
		twoCardCombos: twoCardCombos.length,
		infiniteCombos: infiniteCombos.length,
		earlyGameCombos: earlyGameCombos.length
	});

	const result: ComboDetectionResult = {
		combos,
		twoCardCombos,
		infiniteCombos,
		earlyGameCombos,
		detectionTime: performance.now() - startTime,
		cached: false,
		cardsSearched: cardNames.length
	};

	// Cache the result
	setCachedCombos(deck, result);

	return result;
}

/**
 * Get unique card names from a deck
 * Prioritizes commanders/companions first, then other cards
 */
function getUniqueCardNames(deck: Deck): string[] {
	const names: string[] = [];
	const seen = new Set<string>();

	// Helper to add unique card names
	const addCards = (cards: typeof deck.cards.commander) => {
		for (const card of cards) {
			const nameLower = card.name.toLowerCase();
			if (!seen.has(nameLower)) {
				seen.add(nameLower);
				names.push(card.name);
			}
		}
	};

	// Prioritize commanders and companions first (most likely to be in combos)
	addCards(deck.cards.commander);
	addCards(deck.cards.companion);

	// Then add all other categories
	addCards(deck.cards.planeswalker);
	addCards(deck.cards.creature);
	addCards(deck.cards.instant);
	addCards(deck.cards.sorcery);
	addCards(deck.cards.artifact);
	addCards(deck.cards.enchantment);
	addCards(deck.cards.land);
	addCards(deck.cards.other);

	return names;
}

/**
 * Generate a cache key for a deck based on its card content
 */
function getDeckCacheKey(deck: Deck): string {
	const cardNames = getUniqueCardNames(deck).sort();
	// Create a simple hash of the card list
	return `combos_${cardNames.join('|').substring(0, 100)}`;
}

/**
 * Cache for combo detection results (localStorage)
 */
const CACHE_VERSION = '1';
const CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

interface CachedComboResult {
	version: string;
	timestamp: number;
	result: Omit<ComboDetectionResult, 'cached' | 'detectionTime'>;
}

/**
 * Get cached combo results for a deck
 */
function getCachedCombos(deck: Deck): Omit<ComboDetectionResult, 'cached' | 'detectionTime'> | null {
	if (typeof localStorage === 'undefined') {
		return null;
	}

	try {
		const key = getDeckCacheKey(deck);
		const cached = localStorage.getItem(key);

		if (!cached) {
			return null;
		}

		const parsed: CachedComboResult = JSON.parse(cached);

		// Check version and TTL
		if (parsed.version !== CACHE_VERSION) {
			localStorage.removeItem(key);
			return null;
		}

		const age = Date.now() - parsed.timestamp;
		if (age > CACHE_TTL_MS) {
			localStorage.removeItem(key);
			return null;
		}

		return parsed.result;
	} catch (error) {
		console.error('Error reading combo cache:', error);
		return null;
	}
}

/**
 * Cache combo results for a deck
 */
function setCachedCombos(
	deck: Deck,
	result: Omit<ComboDetectionResult, 'cached' | 'detectionTime'>
): void {
	if (typeof localStorage === 'undefined') {
		return;
	}

	try {
		const key = getDeckCacheKey(deck);
		const cached: CachedComboResult = {
			version: CACHE_VERSION,
			timestamp: Date.now(),
			result
		};

		localStorage.setItem(key, JSON.stringify(cached));
	} catch (error) {
		console.error('Error writing combo cache:', error);
	}
}

/**
 * Clear all cached combo results
 */
export function clearComboCache(): void {
	if (typeof localStorage === 'undefined') {
		return;
	}

	try {
		const keys = Object.keys(localStorage);
		for (const key of keys) {
			if (key.startsWith('combos_')) {
				localStorage.removeItem(key);
			}
		}
	} catch (error) {
		console.error('Error clearing combo cache:', error);
	}
}
