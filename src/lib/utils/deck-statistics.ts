/**
 * Calculate deck statistics (mana curve, color distribution, etc.)
 */

import type { Deck, DeckStatistics } from '$lib/types/deck';
import type { Card, CardCategory, ManaColor } from '$lib/types/card';
import { validateDeck } from './deck-validation';
import { countGameChangers, calculateBracketLevel } from './game-changers';

/**
 * Calculate comprehensive deck statistics
 */
export function calculateStatistics(deck: Deck): DeckStatistics {
	const allCards = getAllCards(deck);
	const uniqueCardNames = getUniqueCardNames(deck);

	// Calculate Game Changer count
	const gameChangerCount = countGameChangers(uniqueCardNames);

	// Calculate bracket level
	const bracketLevel = calculateBracketLevel(gameChangerCount);

	return {
		totalCards: deck.cardCount,
		manaCurve: calculateManaCurve(allCards),
		colorDistribution: calculateColorDistribution(allCards),
		manaProduction: calculateManaProduction(allCards),
		typeDistribution: calculateTypeDistribution(deck),
		averageCmc: calculateAverageCmc(allCards),
		averageCmcWithLands: calculateAverageCmcWithLands(allCards),
		medianCmc: calculateMedianCmc(allCards),
		medianCmcWithLands: calculateMedianCmcWithLands(allCards),
		totalManaValue: calculateTotalManaValue(allCards),
		landCount: countLands(deck),
		nonLandCount: deck.cardCount - countLands(deck),
		totalPrice: calculateTotalPrice(allCards),
		warnings: validateDeck(deck).warnings,
		gameChangerCount,
		bracketLevel
	};
}

/**
 * Get all cards from a deck as a flat array
 */
function getAllCards(deck: Deck): Card[] {
	const cards: Card[] = [];
	for (const category of Object.keys(deck.cards) as CardCategory[]) {
		for (const card of deck.cards[category]) {
			// Expand cards by quantity
			for (let i = 0; i < card.quantity; i++) {
				cards.push(card);
			}
		}
	}
	return cards;
}

/**
 * Get unique card names from a deck (for Game Changer counting)
 */
function getUniqueCardNames(deck: Deck): string[] {
	const names: string[] = [];
	for (const category of Object.keys(deck.cards) as CardCategory[]) {
		for (const card of deck.cards[category]) {
			names.push(card.name);
		}
	}
	return names;
}

/**
 * Calculate mana curve (CMC distribution) split by permanents vs spells
 */
function calculateManaCurve(cards: Card[]): Record<number, { permanents: number; spells: number }> {
	const curve: Record<number, { permanents: number; spells: number }> = {};

	for (const card of cards) {
		// Skip lands
		if (card.types?.some((t) => t.toLowerCase() === 'land')) continue;

		const cmc = card.cmc ?? 0;
		// Group CMC 7+ as "7+"
		const key = Math.min(cmc, 7);

		// Initialize if not exists
		if (!curve[key]) {
			curve[key] = { permanents: 0, spells: 0 };
		}

		// Determine if permanent or spell
		const isPermanent = card.types?.some((t) => {
			const type = t.toLowerCase();
			return (
				type === 'creature' ||
				type === 'artifact' ||
				type === 'enchantment' ||
				type === 'planeswalker'
			);
		});

		const isSpell = card.types?.some((t) => {
			const type = t.toLowerCase();
			return type === 'instant' || type === 'sorcery';
		});

		if (isPermanent) {
			curve[key].permanents++;
		} else if (isSpell) {
			curve[key].spells++;
		} else {
			// If neither, count as permanent (catches weird card types)
			curve[key].permanents++;
		}
	}

	return curve;
}

/**
 * Calculate color distribution based on mana symbols in mana costs
 */
function calculateColorDistribution(cards: Card[]): Record<string, number> {
	const distribution: Record<string, number> = {
		W: 0,
		U: 0,
		B: 0,
		R: 0,
		G: 0,
		C: 0
	};

	for (const card of cards) {
		if (!card.manaCost) continue;

		// Count each mana symbol
		const symbols = card.manaCost.match(/\{[^}]+\}/g) || [];
		for (const symbol of symbols) {
			const cleaned = symbol.replace(/[{}]/g, '');

			// Handle hybrid mana (e.g., "W/U")
			if (cleaned.includes('/')) {
				const colors = cleaned.split('/');
				for (const color of colors) {
					if (color in distribution) {
						distribution[color] += 0.5; // Split hybrid mana
					}
				}
			}
			// Handle single color
			else if (cleaned in distribution) {
				distribution[cleaned]++;
			}
		}
	}

	return distribution;
}

/**
 * Calculate mana production based on lands and mana-producing permanents
 * NOTE: This is a simplified implementation that will be refined later
 */
function calculateManaProduction(cards: Card[]): Record<string, number> {
	const production: Record<string, number> = {
		W: 0,
		U: 0,
		B: 0,
		R: 0,
		G: 0,
		C: 0
	};

	// Basic land names and their corresponding colors
	const basicLands: Record<string, string> = {
		Plains: 'W',
		Island: 'U',
		Swamp: 'B',
		Mountain: 'R',
		Forest: 'G',
		Wastes: 'C'
	};

	for (const card of cards) {
		// Skip non-lands and non-mana-producing permanents
		const isLand = card.types?.some((t) => t.toLowerCase() === 'land');
		const isArtifact = card.types?.some((t) => t.toLowerCase() === 'artifact');

		if (!isLand && !isArtifact) continue;

		// Check basic lands first
		if (basicLands[card.name]) {
			production[basicLands[card.name]]++;
			continue;
		}

		// Parse oracle text for mana production
		const oracleText = card.oracleText || '';

		// Look for "Add {X}" patterns in oracle text
		const addManaPattern = /Add (\{[WUBRGC]\})+/gi;
		const matches = oracleText.matchAll(addManaPattern);

		for (const match of matches) {
			// Extract mana symbols from the match
			const symbols = match[0].match(/\{[WUBRGC]\}/g) || [];
			for (const symbol of symbols) {
				const color = symbol.replace(/[{}]/g, '');
				if (color in production) {
					production[color]++;
				}
			}
			// Only count the first match per card to avoid overcounting
			break;
		}

		// Handle "Choose one" or "Add one mana of any color" type effects
		// These count as 0.2 for each color (flexible mana sources)
		if (oracleText.match(/add one mana of any color/i)) {
			for (const color of ['W', 'U', 'B', 'R', 'G']) {
				production[color] += 0.2;
			}
		}
	}

	return production;
}

/**
 * Calculate card type distribution (percentage by category)
 */
function calculateTypeDistribution(deck: Deck): Record<string, number> {
	const distribution: Record<string, number> = {};

	for (const category of Object.keys(deck.cards) as CardCategory[]) {
		const count = deck.cards[category].reduce((sum, card) => sum + card.quantity, 0);
		if (count > 0) {
			distribution[category] = count;
		}
	}

	return distribution;
}

/**
 * Calculate average converted mana cost (without lands)
 */
function calculateAverageCmc(cards: Card[]): number {
	// Exclude lands from CMC calculation
	const nonLands = cards.filter((card) => !card.types?.some((t) => t.toLowerCase() === 'land'));

	if (nonLands.length === 0) return 0;

	const totalCmc = nonLands.reduce((sum, card) => sum + (card.cmc ?? 0), 0);
	return Number((totalCmc / nonLands.length).toFixed(2));
}

/**
 * Calculate average converted mana cost (with lands)
 */
function calculateAverageCmcWithLands(cards: Card[]): number {
	if (cards.length === 0) return 0;

	const totalCmc = cards.reduce((sum, card) => sum + (card.cmc ?? 0), 0);
	return Number((totalCmc / cards.length).toFixed(2));
}

/**
 * Calculate median converted mana cost (without lands)
 */
function calculateMedianCmc(cards: Card[]): number {
	const nonLands = cards.filter((card) => !card.types?.some((t) => t.toLowerCase() === 'land'));

	if (nonLands.length === 0) return 0;

	const cmcs = nonLands.map((card) => card.cmc ?? 0).sort((a, b) => a - b);
	const mid = Math.floor(cmcs.length / 2);

	if (cmcs.length % 2 === 0) {
		return Number(((cmcs[mid - 1] + cmcs[mid]) / 2).toFixed(2));
	} else {
		return cmcs[mid];
	}
}

/**
 * Calculate median converted mana cost (with lands)
 */
function calculateMedianCmcWithLands(cards: Card[]): number {
	if (cards.length === 0) return 0;

	const cmcs = cards.map((card) => card.cmc ?? 0).sort((a, b) => a - b);
	const mid = Math.floor(cmcs.length / 2);

	if (cmcs.length % 2 === 0) {
		return Number(((cmcs[mid - 1] + cmcs[mid]) / 2).toFixed(2));
	} else {
		return cmcs[mid];
	}
}

/**
 * Calculate total mana value of the deck
 */
function calculateTotalManaValue(cards: Card[]): number {
	return cards.reduce((sum, card) => sum + (card.cmc ?? 0), 0);
}

/**
 * Count total lands in deck
 */
function countLands(deck: Deck): number {
	return deck.cards.land.reduce((sum, card) => sum + card.quantity, 0);
}

/**
 * Calculate total deck price
 */
function calculateTotalPrice(cards: Card[]): number {
	let total = 0;
	for (const card of cards) {
		if (card.price) {
			total += card.price;
		}
	}
	return Number(total.toFixed(2));
}

/**
 * Suggest land count based on deck composition
 */
export function suggestLandCount(averageCmc: number, nonLandCount: number): number {
	// Basic heuristic: higher average CMC needs more lands
	const baselands = 35;
	const cmcAdjustment = Math.floor((averageCmc - 3) * 2);
	return Math.max(30, Math.min(40, baselands + cmcAdjustment));
}

/**
 * Enrich statistics with combo detection data (async)
 *
 * This function:
 * 1. Detects combos using Commander Spellbook API
 * 2. Updates bracket level based on combo count
 * 3. Returns enriched statistics
 *
 * @param deck - The deck to analyze
 * @param baseStats - Base statistics (from calculateStatistics)
 * @param useCache - Whether to use cached combo results
 */
export async function enrichStatisticsWithCombos(
	deck: Deck,
	baseStats: DeckStatistics,
	useCache: boolean = true
): Promise<DeckStatistics> {
	try {
		// Dynamically import combo service (browser-only)
		const { detectCombos } = await import('$lib/api/combo-service');

		// Mark as loading
		const loadingStats: DeckStatistics = {
			...baseStats,
			combosLoading: true,
			combosError: undefined
		};

		// Detect combos
		const comboResult = await detectCombos(deck, useCache);

		// Recalculate bracket level with combo data
		const uniqueCardNames = getUniqueCardNames(deck);
		const gameChangerCount = countGameChangers(uniqueCardNames);

		const bracketLevel = calculateBracketLevel(gameChangerCount, {
			twoCardComboCount: comboResult.twoCardCombos.length,
			earlyGameComboCount: comboResult.earlyGameCombos.length
		});

		// Return enriched statistics
		return {
			...baseStats,
			combos: comboResult.combos,
			twoCardComboCount: comboResult.twoCardCombos.length,
			earlyGameComboCount: comboResult.earlyGameCombos.length,
			bracketLevel, // Updated bracket with combo data
			combosLoading: false,
			combosError: undefined
		};
	} catch (error) {
		console.error('Failed to detect combos:', error);

		// Return stats with error state
		return {
			...baseStats,
			combosLoading: false,
			combosError: error instanceof Error ? error.message : 'Unknown error detecting combos'
		};
	}
}
